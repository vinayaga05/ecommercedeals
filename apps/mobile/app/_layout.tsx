import { Stack } from 'expo-router'
import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export default function RootLayout() {
  useEffect(() => {
    registerForPushNotifications()
  }, [])

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#3b82f6',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'PriceWatch',
        }}
      />
      <Stack.Screen
        name="add-product"
        options={{
          title: 'Add Product',
        }}
      />
      <Stack.Screen
        name="watch-list"
        options={{
          title: 'My Watches',
        }}
      />
      <Stack.Screen
        name="product/[id]"
        options={{
          title: 'Product Details',
        }}
      />
    </Stack>
  )
}

async function registerForPushNotifications() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!')
    return
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data
  console.log('Push notification token:', token)
}
