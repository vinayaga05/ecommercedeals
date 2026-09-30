import { useState, useEffect } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Link } from 'expo-router'
import { api } from '@/lib/api'

export default function WatchList() {
  const [watches, setWatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWatches()
  }, [])

  const loadWatches = async () => {
    try {
      const response = await api.get('/watches/user/demo-user')
      setWatches(response.data)
    } catch (error) {
      console.error('Error loading watches:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  if (watches.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No products in watch list</Text>
        <Link href="/add-product" asChild>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Add Your First Product</Text>
          </TouchableOpacity>
        </Link>
      </View>
    )
  }

  const renderWatch = ({ item }: any) => {
    const latestPrice = item.listing.priceSnapshots[0]

    return (
      <Link href={`/product/${item.listing.productId}`} asChild>
        <TouchableOpacity style={styles.card}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.listing.product.name}
          </Text>
          <Text style={styles.retailer}>{item.listing.retailer}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>
              ₹{parseFloat(latestPrice.effectivePrice).toLocaleString('en-IN')}
            </Text>
            {item.targetPrice && (
              <Text style={styles.targetPrice}>
                Target: ₹{parseFloat(item.targetPrice).toLocaleString('en-IN')}
              </Text>
            )}
          </View>

          {latestPrice.mrp && parseFloat(latestPrice.mrp) > parseFloat(latestPrice.effectivePrice) && (
            <Text style={styles.discount}>
              {Math.round(((parseFloat(latestPrice.mrp) - parseFloat(latestPrice.effectivePrice)) / parseFloat(latestPrice.mrp)) * 100)}% off
            </Text>
          )}
        </TouchableOpacity>
      </Link>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={watches}
        renderItem={renderWatch}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  retailer: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  targetPrice: {
    fontSize: 14,
    color: '#6b7280',
  },
  discount: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})
