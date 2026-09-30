import { forwardRef } from "react";
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput, type TextInputProps, type TextProps } from "react-native";
import { fontFamilyForWeight } from "../design/typography";

/** Adds the brand font for the requested weight unless the caller picked a specific family. */
function withBrandFont(style: TextProps["style"]) {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return style;
  return [style, { fontFamily: fontFamilyForWeight(flat.fontWeight), fontWeight: "normal" as const }];
}

export const Text = forwardRef<NativeText, TextProps>(function Text(props, ref) {
  return <NativeText ref={ref} {...props} style={withBrandFont(props.style)} />;
});

export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function TextInput(props, ref) {
  return <NativeTextInput ref={ref} {...props} style={withBrandFont(props.style)} />;
});
