import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Link } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

export default function Home() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PriceWatch</Text>
        <Text style={styles.subtitle}>Track prices on Amazon & Flipkart</Text>
      </View>

      <View style={styles.actions}>
        <Link href="/add-product" asChild>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>+ Add Product Link</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/watch-list" asChild>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>My Watch List</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View style={styles.features}>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>📊</Text>
          <Text style={styles.featureTitle}>Price History</Text>
          <Text style={styles.featureText}>Track price changes over time</Text>
        </View>

        <View style={styles.feature}>
          <Text style={styles.featureIcon}>🔔</Text>
          <Text style={styles.featureTitle}>Smart Alerts</Text>
          <Text style={styles.featureText}>Get notified on price drops</Text>
        </View>

        <View style={styles.feature}>
          <Text style={styles.featureIcon}>🎯</Text>
          <Text style={styles.featureTitle}>Target Price</Text>
          <Text style={styles.featureText}>Set your ideal price point</Text>
        </View>
      </View>

      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  header: {
    marginTop: 40,
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  actions: {
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  features: {
    gap: 20,
  },
  feature: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#6b7280',
  },
})
