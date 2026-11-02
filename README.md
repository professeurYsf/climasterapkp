# CLI Master — Android 1.0.0  (com.climaster.profysf)

## Construire l'APK
**Android Studio** : File ▸ Open ▸ ce dossier ▸ Build ▸ Build APK(s)  (ou `./gradlew assembleRelease`)
→ APK non signé (aucune clé incluse).
Play Store : Build ▸ Generate Signed Bundle / APK avec TA clé, ou `./gradlew bundleRelease` puis signe l'AAB.
Option : crée `keystore.properties` (storeFile, storePassword, keyAlias, keyPassword) à la racine pour signer automatiquement.

**Sans Android Studio** : mets ce dossier dans un dépôt GitHub → onglet Actions ▸ « Build APK » ▸ Run workflow → télécharge l'artefact.

## Réglages
- minSdk 21 (Android 5) · targetSdk/compileSdk 36 · AdMob 23.6.0 (dernière branche compatible Android 5).
- Appareil de test : `TEST_DEVICE` dans `MainActivity.java` (pubs de test seulement sur cet appareil).
- Pubs : récompensée = indice au-delà des 2 gratuits ; interstitielle = à chaque fin de mission.
- Contenu web : `app/src/main/assets/www/` (copie du projet d'origine).
