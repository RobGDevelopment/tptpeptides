# Set a Firebase user's role to admin (Firestore fallback until custom claims are configured).
#
# 1. Open Firebase Console → Firestore → users collection
# 2. Find or create document: users/{uid}
# 3. Set field: role = "admin"
#
# Optional (Phase C+): Use Firebase Admin SDK to set custom claims:
#   admin.auth().setCustomUserClaims(uid, { admin: true, role: 'admin' });
