import { readFile, writeFile } from 'node:fs/promises';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
const scheme = 'com.jurisflow.argentina';
const host = 'auth';
const pathPrefix = '/callback';

let manifest;
try {
  manifest = await readFile(manifestPath, 'utf8');
} catch {
  console.error(`No se encontró ${manifestPath}. Ejecutá este script después de "npx cap add android".`);
  process.exit(1);
}

if (manifest.includes(`android:scheme="${scheme}"`) && manifest.includes(`android:host="${host}"`)) {
  console.log('El deep link de autenticación ya está registrado.');
  process.exit(0);
}

const activities = [...manifest.matchAll(/<activity\b[\s\S]*?<\/activity>/g)];
const launcherActivity = activities.find(([block]) =>
  block.includes('android.intent.action.MAIN') &&
  block.includes('android.intent.category.LAUNCHER')
);
if (!launcherActivity) {
  console.error('No se encontró la actividad de inicio de AndroidManifest.xml.');
  process.exit(1);
}

const activityEnd = launcherActivity.index + launcherActivity[0].lastIndexOf('</activity>');
if (activityEnd < launcherActivity.index) {
  console.error('No se pudo identificar el cierre de la actividad principal.');
  process.exit(1);
}

const intentFilter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="${scheme}" android:host="${host}" android:pathPrefix="${pathPrefix}" />
            </intent-filter>
`;

manifest = manifest.slice(0, activityEnd) + intentFilter + manifest.slice(activityEnd);
await writeFile(manifestPath, manifest, 'utf8');
console.log(`Deep link registrado: ${scheme}://${host}${pathPrefix}`);
