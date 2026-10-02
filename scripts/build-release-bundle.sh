#!/usr/bin/env bash
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ANDROID_DIR="${ROOT_DIR}/apps/mobile/android"
KEYSTORE_PATH="${ANDROID_DIR}/app/release.keystore"

if [ ! -f "${KEYSTORE_PATH}" ]; then
  echo "Error: Keystore not found at ${KEYSTORE_PATH}"
  echo "Please generate it first or place your release.keystore in apps/mobile/android/app/"
  exit 1
fi

echo "=== Restrainify Release Bundle Builder ==="

# Read password without echoing to terminal and without logging to shell history
read -r -s -p "Enter keystore password: " INPUT_PASS
echo ""

if [ -z "${INPUT_PASS}" ]; then
  echo "Error: Password cannot be empty."
  exit 1
fi

echo "Building release bundle (AAB)..."
(
  cd "${ANDROID_DIR}"
  KEYSTORE_PASSWORD="${INPUT_PASS}" KEY_PASSWORD="${INPUT_PASS}" ./gradlew clean :app:bundleRelease
)

# Unset password variable from memory
unset INPUT_PASS

AAB_OUTPUT="${ANDROID_DIR}/app/build/outputs/bundle/release/app-release.aab"

if [ -f "${AAB_OUTPUT}" ]; then
  echo ""
  echo "=== Verifying Bundle Signature ==="
  keytool -printcert -jarfile "${AAB_OUTPUT}" | grep -E "Owner:|Issuer:|SHA256:"
  echo ""
  echo "SUCCESS! Release AAB ready at:"
  echo "${AAB_OUTPUT}"
else
  echo "Error: Bundle output not found at ${AAB_OUTPUT}"
  exit 1
fi
