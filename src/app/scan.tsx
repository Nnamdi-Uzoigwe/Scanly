// import { CameraView, useCameraPermissions } from "expo-camera";
// import { router } from "expo-router";
// import { ArrowLeft, RotateCcw, ScanLine, X } from "lucide-react-native";
// import { useRef, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   Image,
//   Pressable,
//   StyleSheet,
//   Text,
//   TextInput,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";

// import { saveDocument } from "@/lib/documents";
// import { theme } from "../constants/theme";

// export default function ScanScreen() {
//   const [permission, requestPermission] = useCameraPermissions();
//   const cameraRef = useRef<CameraView>(null);
//   const [capturedUri, setCapturedUri] = useState<string | null>(null);
//   const [capturing, setCapturing] = useState(false);
//   const [cameraReady, setCameraReady] = useState(false);
//   const [documentTitle, setDocumentTitle] = useState("");
//   const [saving, setSaving] = useState(false);

//   async function handleSaveDocument() {
//     if (!capturedUri || saving) return;

//     try {
//       setSaving(true);

//       await saveDocument({
//         title:
//           documentTitle.trim() || `Scan ${new Date().toLocaleDateString()}`,
//         sourceUris: [capturedUri],
//       });

//       router.replace("/home");
//     } catch (error) {
//       console.error("Failed to save scan:", error);
//       Alert.alert(
//         "Couldn't save scan",
//         "Please try again. Your captured image is still available on this screen.",
//       );
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function takePicture() {
//     if (!cameraRef.current || capturing || !cameraReady) return;

//     try {
//       setCapturing(true);
//       const photo = await cameraRef.current.takePictureAsync({
//         quality: 0.9,
//         skipProcessing: false,
//       });

//       if (photo?.uri) {
//         setCapturedUri(photo.uri);
//       }
//     } catch (error) {
//       console.error("Failed to capture document:", error);
//     } finally {
//       setCapturing(false);
//     }
//   }

//   if (!permission) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator color={theme.colors.accent} />
//       </View>
//     );
//   }

//   if (!permission.granted) {
//     return (
//       <SafeAreaView style={styles.permissionScreen}>
//         <Pressable
//           onPress={() => router.back()}
//           style={styles.backButton}
//           accessibilityRole="button"
//           accessibilityLabel="Go back"
//         >
//           <ArrowLeft size={21} color={theme.colors.text} />
//         </Pressable>

//         <View style={styles.permissionContent}>
//           <ScanLine size={42} color={theme.colors.accent} />
//           <Text style={styles.permissionTitle}>Camera access required</Text>
//           <Text style={styles.permissionDescription}>
//             Scanly needs camera access to capture document pages. Your scans
//             will be handled locally on your device.
//           </Text>

//           <Pressable
//             onPress={requestPermission}
//             style={styles.permissionButton}
//             accessibilityRole="button"
//           >
//             <Text style={styles.permissionButtonText}>Allow camera access</Text>
//           </Pressable>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.screen}>
//       <View style={styles.header}>
//         <Pressable
//           onPress={() => router.back()}
//           style={styles.backButton}
//           accessibilityRole="button"
//           accessibilityLabel="Go back"
//         >
//           <ArrowLeft size={21} color={theme.colors.text} />
//         </Pressable>

//         <View style={styles.headerText}>
//           <Text style={styles.title}>
//             {capturedUri ? "Review capture" : "Scan document"}
//           </Text>
//           <Text style={styles.subtitle}>
//             {capturedUri
//               ? "Check the image before continuing"
//               : "Position the page inside the frame"}
//           </Text>
//         </View>

//         {capturedUri ? (
//           <Pressable
//             onPress={() => setCapturedUri(null)}
//             style={styles.backButton}
//             accessibilityRole="button"
//             accessibilityLabel="Discard captured image"
//           >
//             <X size={20} color={theme.colors.text} />
//           </Pressable>
//         ) : (
//           <View style={styles.headerSpacer} />
//         )}
//       </View>

//       <View style={styles.cameraArea}>
//         {capturedUri ? (
//           <Image
//             source={{ uri: capturedUri }}
//             style={styles.preview}
//             resizeMode="contain"
//             accessibilityLabel="Captured document preview"
//           />
//         ) : (
//           <>
//             <CameraView
//               ref={cameraRef}
//               style={StyleSheet.absoluteFill}
//               facing="back"
//               mode="picture"
//               onCameraReady={() => setCameraReady(true)}
//             />
//             <View pointerEvents="none" style={styles.frameContainer}>
//               <View style={styles.documentFrame}>
//                 <View style={[styles.corner, styles.topLeft]} />
//                 <View style={[styles.corner, styles.topRight]} />
//                 <View style={[styles.corner, styles.bottomLeft]} />
//                 <View style={[styles.corner, styles.bottomRight]} />
//               </View>
//               <Text style={styles.frameHint}>
//                 Keep the entire page inside the frame
//               </Text>
//             </View>
//           </>
//         )}

//         {capturing && (
//           <View style={styles.captureOverlay}>
//             <ActivityIndicator size="large" color={theme.colors.text} />
//           </View>
//         )}
//       </View>

//       <View style={styles.controls}>
//         {capturedUri ? (
//           //   <>
//           //     <Pressable
//           //       style={styles.secondaryButton}
//           //       onPress={() => {
//           //         setCapturedUri(null);
//           //         setCameraReady(false);
//           //       }}
//           //       accessibilityRole="button"
//           //     >
//           //       <RotateCcw size={18} color={theme.colors.text} />
//           //       <Text style={styles.secondaryButtonText}>Retake</Text>
//           //     </Pressable>

//           //     <Text style={styles.reviewNote}>
//           //       Image captured. Document review and saving come next.
//           //     </Text>
//           //   </>
//           <>
//             <TextInput
//               value={documentTitle}
//               onChangeText={setDocumentTitle}
//               placeholder="Document title"
//               placeholderTextColor={theme.colors.muted}
//               accessibilityLabel="Document title"
//               returnKeyType="done"
//               style={{
//                 width: "100%",
//                 color: theme.colors.text,
//                 backgroundColor: theme.colors.surface,
//                 borderColor: theme.colors.border,
//                 borderWidth: 1,
//                 borderRadius: theme.radius.md,
//                 paddingHorizontal: 16,
//                 paddingVertical: 13,
//                 marginBottom: 14,
//               }}
//             />

//             <View style={styles.reviewActions}>
//               <Pressable
//                 style={styles.secondaryButton}
//                 onPress={() => setCapturedUri(null)}
//                 disabled={saving}
//               >
//                 <RotateCcw size={18} color={theme.colors.text} />
//                 <Text style={styles.secondaryButtonText}>Retake</Text>
//               </Pressable>

//               <Pressable
//                 style={[styles.saveButton, saving && styles.disabled]}
//                 onPress={handleSaveDocument}
//                 disabled={saving}
//                 accessibilityRole="button"
//               >
//                 {saving ? (
//                   <ActivityIndicator color={theme.colors.text} />
//                 ) : (
//                   <Text style={styles.saveButtonText}>Save scan</Text>
//                 )}
//               </Pressable>
//             </View>
//           </>
//         ) : (
//           <>
//             <Text style={styles.controlHint}>
//               Use even lighting and avoid shadows
//             </Text>

//             <Pressable
//               onPress={takePicture}
//               disabled={!cameraReady || capturing}
//               accessibilityRole="button"
//               accessibilityLabel="Capture document page"
//               style={[
//                 styles.shutterOuter,
//                 (!cameraReady || capturing) && styles.disabled,
//               ]}
//             >
//               <View style={styles.shutterInner} />
//             </Pressable>

//             <Text style={styles.captureLabel}>Capture page</Text>
//           </>
//         )}
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   screen: {
//     flex: 1,
//     backgroundColor: theme.colors.background,
//   },
//   center: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: theme.colors.background,
//   },
//   permissionScreen: {
//     flex: 1,
//     backgroundColor: theme.colors.background,
//     paddingHorizontal: 24,
//   },
//   permissionContent: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   permissionTitle: {
//     color: theme.colors.text,
//     fontSize: 22,
//     fontWeight: "700",
//     textAlign: "center",
//     marginTop: 24,
//   },
//   permissionDescription: {
//     color: theme.colors.muted,
//     fontSize: 14,
//     lineHeight: 22,
//     textAlign: "center",
//     marginTop: 12,
//     marginBottom: 24,
//   },
//   permissionButton: {
//     backgroundColor: theme.colors.accent,
//     borderRadius: theme.radius.md,
//     paddingHorizontal: 22,
//     paddingVertical: 15,
//   },
//   permissionButtonText: {
//     color: "#FFFFFF",
//     fontSize: 14,
//     fontWeight: "600",
//   },
//   header: {
//     minHeight: 76,
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 18,
//     gap: 12,
//   },
//   backButton: {
//     width: 42,
//     height: 42,
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: theme.colors.surface,
//     borderRadius: theme.radius.md,
//     borderWidth: 1,
//     borderColor: theme.colors.border,
//   },
//   headerText: {
//     flex: 1,
//   },
//   title: {
//     color: theme.colors.text,
//     fontSize: 17,
//     fontWeight: "600",
//   },
//   subtitle: {
//     color: theme.colors.muted,
//     fontSize: 12,
//     marginTop: 4,
//   },
//   headerSpacer: {
//     width: 42,
//   },
//   cameraArea: {
//     flex: 1,
//     marginHorizontal: 16,
//     marginTop: 8,
//     marginBottom: 12,
//     borderRadius: theme.radius.lg,
//     overflow: "hidden",
//     backgroundColor: "#050608",
//     borderWidth: 1,
//     borderColor: theme.colors.border,
//   },
//   frameContainer: {
//     ...StyleSheet.absoluteFill,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   documentFrame: {
//     width: "82%",
//     height: "76%",
//     borderRadius: 4,
//   },
//   corner: {
//     position: "absolute",
//     width: 26,
//     height: 26,
//     borderColor: theme.colors.accent,
//   },
//   topLeft: {
//     top: 0,
//     left: 0,
//     borderTopWidth: 3,
//     borderLeftWidth: 3,
//   },
//   topRight: {
//     top: 0,
//     right: 0,
//     borderTopWidth: 3,
//     borderRightWidth: 3,
//   },
//   bottomLeft: {
//     bottom: 0,
//     left: 0,
//     borderBottomWidth: 3,
//     borderLeftWidth: 3,
//   },
//   bottomRight: {
//     bottom: 0,
//     right: 0,
//     borderBottomWidth: 3,
//     borderRightWidth: 3,
//   },
//   frameHint: {
//     position: "absolute",
//     bottom: 24,
//     color: "#FFFFFF",
//     backgroundColor: "#10131BCC",
//     paddingHorizontal: 14,
//     paddingVertical: 9,
//     borderRadius: theme.radius.full,
//     fontSize: 12,
//     overflow: "hidden",
//   },
//   preview: {
//     width: "100%",
//     height: "100%",
//   },
//   captureOverlay: {
//     ...StyleSheet.absoluteFill,
//     backgroundColor: "#00000066",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   controls: {
//     minHeight: 150,
//     alignItems: "center",
//     justifyContent: "center",
//     paddingHorizontal: 24,
//     paddingBottom: 18,
//   },
//   controlHint: {
//     color: theme.colors.muted,
//     fontSize: 12,
//     marginBottom: 20,
//   },
//   shutterOuter: {
//     width: 74,
//     height: 74,
//     borderRadius: 37,
//     borderWidth: 3,
//     borderColor: theme.colors.text,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   shutterInner: {
//     width: 58,
//     height: 58,
//     borderRadius: 29,
//     backgroundColor: theme.colors.text,
//   },
//   captureLabel: {
//     color: theme.colors.text,
//     fontSize: 12,
//     marginTop: 10,
//   },
//   secondaryButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 8,
//     backgroundColor: theme.colors.elevated,
//     borderWidth: 1,
//     borderColor: theme.colors.border,
//     borderRadius: theme.radius.md,
//     paddingHorizontal: 22,
//     paddingVertical: 13,
//   },
//   secondaryButtonText: {
//     color: theme.colors.text,
//     fontSize: 14,
//     fontWeight: "600",
//   },
//   reviewNote: {
//     color: theme.colors.muted,
//     fontSize: 12,
//     textAlign: "center",
//     marginTop: 16,
//   },
//   disabled: {
//     opacity: 0.45,
//   },
//   reviewActions: {
//     width: "100%",
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 12,
//   },
//   saveButton: {
//     flex: 1,
//     minHeight: 54,
//     borderRadius: theme.radius.md,
//     backgroundColor: theme.colors.accent,
//     alignItems: "center",
//     justifyContent: "center",
//     paddingHorizontal: 18,
//   },
//   saveButtonText: {
//     color: "#FFFFFF",
//     fontSize: 14,
//     fontWeight: "600",
//   },
//   // disabled: {
//   //   opacity: 0.5,
//   // },
// });

import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { ArrowLeft, ScanLine, Trash2, X } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { saveDocument } from "@/lib/documents";
import { theme } from "../constants/theme";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [capturedUris, setCapturedUris] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const pageCount = capturedUris.length;
  const inPreview = previewIndex !== null;

  async function handleSaveDocument() {
    if (pageCount === 0 || saving) return;
    try {
      setSaving(true);
      await saveDocument({
        title: `Scan ${new Date().toLocaleDateString()}`,
        sourceUris: capturedUris,
      });
      router.replace("/home");
    } catch (error) {
      console.error("Failed to save scan:", error);
      Alert.alert(
        "Couldn't save scan",
        "Please try again. Your captured pages are still available.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function takePicture() {
    if (!cameraRef.current || capturing || !cameraReady) return;
    try {
      setCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });
      if (photo?.uri) {
        setCapturedUris((prev) => [...prev, photo.uri]);
      }
    } catch (error) {
      console.error("Failed to capture document:", error);
      Alert.alert("Couldn't capture page", "Please try again.");
    } finally {
      setCapturing(false);
    }
  }

  function handleDeleteCurrentPage() {
    if (previewIndex === null) return;
    setCapturedUris((prev) => prev.filter((_, i) => i !== previewIndex));
    setPreviewIndex(null);
  }

  function handleBackPress() {
    if (inPreview) {
      setPreviewIndex(null);
      return;
    }
    if (pageCount === 0) {
      router.back();
      return;
    }
    Alert.alert(
      "Discard scan?",
      `${pageCount} ${pageCount === 1 ? "page" : "pages"} will be discarded.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            setCapturedUris([]);
            router.back();
          },
        },
      ],
    );
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <Pressable
          onPress={() => router.back()}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={21} color={theme.colors.text} />
        </Pressable>

        <View style={styles.permissionContent}>
          <ScanLine size={42} color={theme.colors.accent} />
          <Text style={styles.permissionTitle}>Camera access required</Text>
          <Text style={styles.permissionDescription}>
            Scanly needs camera access to capture document pages. Your scans
            will be handled locally on your device.
          </Text>
          <Pressable
            onPress={requestPermission}
            style={styles.permissionButton}
            accessibilityRole="button"
          >
            <Text style={styles.permissionButtonText}>Allow camera access</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBackPress}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel={inPreview ? "Back to camera" : "Go back"}
        >
          {inPreview ? (
            <ArrowLeft size={21} color={theme.colors.text} />
          ) : (
            <X size={21} color={theme.colors.text} />
          )}
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            {inPreview
              ? `Page ${previewIndex + 1} of ${pageCount}`
              : "Scan document"}
          </Text>
          <Text style={styles.subtitle}>
            {inPreview
              ? "Review the page before continuing"
              : pageCount === 0
                ? "Position the page inside the frame"
                : `${pageCount} ${pageCount === 1 ? "page" : "pages"} captured`}
          </Text>
        </View>

        {inPreview ? (
          <Pressable
            onPress={handleDeleteCurrentPage}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Delete this page"
          >
            <Trash2 size={19} color={theme.colors.danger} />
          </Pressable>
        ) : pageCount > 0 ? (
          <Pressable
            onPress={handleSaveDocument}
            disabled={saving}
            style={[styles.headerSaveButton, saving && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel={`Save document with ${pageCount} pages`}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.headerSaveText}>Save ({pageCount})</Text>
            )}
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <View style={styles.cameraArea}>
        {inPreview ? (
          <Image
            source={{ uri: capturedUris[previewIndex] }}
            style={styles.preview}
            resizeMode="contain"
            accessibilityLabel={`Page ${previewIndex + 1} preview`}
          />
        ) : (
          <>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              mode="picture"
              onCameraReady={() => setCameraReady(true)}
            />
            <View pointerEvents="none" style={styles.frameContainer}>
              <View style={styles.documentFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <Text style={styles.frameHint}>
                Keep the entire page inside the frame
              </Text>
            </View>
          </>
        )}

        {capturing && (
          <View style={styles.captureOverlay}>
            <ActivityIndicator size="large" color={theme.colors.text} />
          </View>
        )}
      </View>

      {!inPreview && (
        <View style={styles.controls}>
          {pageCount > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filmstrip}
            >
              {capturedUris.map((uri, index) => (
                <Pressable
                  key={`${uri}-${index}`}
                  onPress={() => setPreviewIndex(index)}
                  style={styles.filmstripItem}
                  accessibilityRole="button"
                  accessibilityLabel={`Open page ${index + 1}`}
                >
                  <Image source={{ uri }} style={styles.filmstripThumb} />
                  <View style={styles.filmstripBadge}>
                    <Text style={styles.filmstripBadgeText}>{index + 1}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <Pressable
            onPress={takePicture}
            disabled={!cameraReady || capturing}
            accessibilityRole="button"
            accessibilityLabel={
              pageCount === 0 ? "Capture page" : "Add another page"
            }
            style={[
              styles.shutterOuter,
              (!cameraReady || capturing) && styles.disabled,
            ]}
          >
            <View style={styles.shutterInner} />
          </Pressable>

          <Text style={styles.captureLabel}>
            {pageCount === 0 ? "Capture page" : "Add another page"}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  permissionScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 24,
  },
  permissionContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 24,
  },
  permissionDescription: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingHorizontal: 22,
    paddingVertical: 15,
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerText: { flex: 1 },
  title: { color: theme.colors.text, fontSize: 17, fontWeight: "600" },
  subtitle: { color: theme.colors.muted, fontSize: 12, marginTop: 4 },
  headerSpacer: { width: 42 },
  headerSaveButton: {
    minWidth: 84,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSaveText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  cameraArea: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    backgroundColor: "#050608",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  frameContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  documentFrame: { width: "82%", height: "76%", borderRadius: 4 },
  corner: {
    position: "absolute",
    width: 26,
    height: 26,
    borderColor: theme.colors.accent,
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  frameHint: {
    position: "absolute",
    bottom: 24,
    color: "#FFFFFF",
    backgroundColor: "#10131BCC",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: theme.radius.full,
    fontSize: 12,
    overflow: "hidden",
  },
  preview: { width: "100%", height: "100%" },
  captureOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#00000066",
    alignItems: "center",
    justifyContent: "center",
  },
  controls: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 8,
    gap: 16,
  },
  filmstrip: { gap: 10, paddingHorizontal: 4 },
  filmstripItem: {
    width: 60,
    height: 76,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.elevated,
  },
  filmstripThumb: { width: "100%", height: "100%" },
  filmstripBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  filmstripBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "600" },
  shutterOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: theme.colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.colors.text,
  },
  captureLabel: { color: theme.colors.text, fontSize: 12 },
  disabled: { opacity: 0.45 },
});
