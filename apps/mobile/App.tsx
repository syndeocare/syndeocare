import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.brand}>SyndeoCare</Text>
          <Text style={styles.tagline}>
            Healthcare staffing, built for Yemen
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.title}>Mobile app foundation is ready</Text>
          <Text style={styles.body}>
            This Expo app is linked to the SyndeoCare EAS project and ready for
            the role-aware professional and clinic flows.
          </Text>

          <View style={styles.roleGrid}>
            <View style={styles.roleCard}>
              <Text style={styles.roleTitle}>Professionals</Text>
              <Text style={styles.roleText}>
                Discover shifts, apply, message clinics, and manage documents.
              </Text>
            </View>
            <View style={styles.roleCard}>
              <Text style={styles.roleTitle}>Clinics</Text>
              <Text style={styles.roleText}>
                Publish shifts, review applicants, invite staff, and coordinate
                bookings.
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#150d1c",
  },
  safeArea: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
  },
  header: {
    paddingTop: 28,
  },
  brand: {
    color: "#ffffff",
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: 0,
  },
  tagline: {
    color: "#d9c9e8",
    fontSize: 17,
    lineHeight: 24,
    marginTop: 10,
  },
  panel: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
  },
  title: {
    color: "#21162b",
    fontSize: 25,
    fontWeight: "800",
    lineHeight: 32,
  },
  body: {
    color: "#5c5368",
    fontSize: 16,
    lineHeight: 23,
    marginTop: 12,
  },
  roleGrid: {
    gap: 12,
    marginTop: 22,
  },
  roleCard: {
    backgroundColor: "#f6f1f8",
    borderColor: "#eadff0",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  roleTitle: {
    color: "#3a214d",
    fontSize: 17,
    fontWeight: "800",
  },
  roleText: {
    color: "#665a70",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
});
