import AIChat from '@/components/AIChat';
import { createDrawerNavigator } from '@react-navigation/drawer';

const Drawer = createDrawerNavigator();

export default function AIChatScreen() {
  return (
    <Drawer.Navigator screenOptions={{headerShown: false}}>
      <Drawer.Screen name='AI' component={AIChat} />
    </Drawer.Navigator>
  )
}