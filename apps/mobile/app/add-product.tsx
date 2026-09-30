import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { api } from '@/lib/api'

export default function AddProduct() {
  const [url, setUrl] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a product URL')
      return
    }

    setLoading(true)
    try {
      const productRes = await api.post('/products', { url })
      const listing = productRes.data

      await api.post('/watches', {
        userId: 'demo-user',
        listingId: listing.id,
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
        dropPercentage: 10,
        lowestIn30Days: true,
      })

      Alert.alert('Success', 'Product added to watch list!')
      router.push('/watch-list')
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Product URL</Text>
      <TextInput
        style={styles.input}
        placeholder="Paste Amazon or Flipkart product link"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
      />

      <Text style={styles.label}>Target Price (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter target price in ₹"
        value={targetPrice}
        onChangeText={setTargetPrice}
        keyboardType="numeric"
      />

      <Text style={styles.hint}>
        You'll be notified when the price drops to or below your target price
      </Text>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Adding...' : 'Add to Watch List'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    marginTop: 32,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})
