import { useGetImage, useUploadProfilePicture } from '@/api/files';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Button, Image, Text, View } from 'react-native';

export default function TestUploadScreen() {
  const [imageId, setImageId] = useState<string | null>(null);
  const uploadMutation = useUploadProfilePicture();
  
  const { data: imageData } = useGetImage(
    imageId!,
    'small',
  );

  const pickAndUploadImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission denied');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Fixed: use array instead of MediaTypeOptions
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      uploadMutation.mutate(
        { uri: result.assets[0].uri },
        {
          onSuccess: (data) => {
            console.log('Upload success:', data);
            setImageId(data.imageId);
          },
          onError: (error) => {
            console.error('Upload error:', error);
            alert('Upload failed: ' + JSON.stringify(error));
          },
        }
      );
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Button title="Pick and Upload Image" onPress={pickAndUploadImage} />
      
      {uploadMutation.isPending && <Text>Uploading...</Text>}
      
      {uploadMutation.isSuccess && (
        <View>
          <Text>Upload successful!</Text>
          <Text>Image ID: {uploadMutation.data.imageId}</Text>
        </View>
      )}
      
      {imageData && (
        <View>
          <Text>Retrieved Image URL:</Text>
          <Image source={{ uri: imageData.url }} style={{ width: 200, height: 200 }} />
        </View>
      )}
    </View>
  );
}