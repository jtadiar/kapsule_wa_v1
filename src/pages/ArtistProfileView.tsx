// Only updating the relevant part of the file - the downloadAndStoreGeneratedImage function
// and handleGenerateCoverArt function

const downloadAndStoreGeneratedImage = async (imageUrl: string): Promise<string> => {
  try {
    console.log('Downloading generated image from:', imageUrl);
    
    // Download the image from the temporary URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Failed to download generated image');
    }
    
    const imageBlob = await response.blob();
    
    // Create a unique filename for the generated image
    const fileName = `${user?.id}/${Date.now()}-generated-cover.png`;
    
    // Upload to Supabase storage
    const { data, error: uploadError } = await supabase.storage
      .from('coverart')
      .upload(fileName, imageBlob, {
        contentType: 'image/png',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Error uploading to Supabase:', uploadError);
      throw uploadError;
    }

    // Get the permanent public URL
    const { data: { publicUrl } } = supabase.storage
      .from('coverart')
      .getPublicUrl(fileName);

    console.log('Successfully stored generated image at:', publicUrl);
    return publicUrl;
    
  } catch (error) {
    console.error('Error downloading and storing generated image:', error);
    throw new Error('Failed to store generated artwork. Please try again.');
  }
};

const handleGenerateCoverArt = async () => {
  if (!newTrack.coverArtPrompt.trim()) {
    setError('Please enter a prompt for the cover art');
    return;
  }

  try {
    setNewTrack(prev => ({ ...prev, isGeneratingArt: true }));
    setError('');
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cover-art`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        prompt: newTrack.coverArtPrompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate cover art');
    }

    const { url: temporaryUrl } = await response.json();
    
    if (!temporaryUrl) {
      throw new Error('No image URL received from generation service');
    }
    
    console.log('Received temporary URL:', temporaryUrl);
    
    // Download and store the image permanently
    const permanentUrl = await downloadAndStoreGeneratedImage(temporaryUrl);
    
    setNewTrack(prev => ({ ...prev, coverArtUrl: permanentUrl }));
  } catch (error) {
    console.error('Error generating cover art:', error);
    setError(error instanceof Error ? error.message : 'Failed to generate cover art');
  } finally {
    setNewTrack(prev => ({ ...prev, isGeneratingArt: false }));
  }
};