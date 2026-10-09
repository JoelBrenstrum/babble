import * as WebBrowser from 'expo-web-browser';
import { Pressable, Text, View } from 'react-native';
import { Card, SectionLabel } from '@/components/card';

export function legalUrls(publicUrl: string) {
  return { privacy: `${publicUrl}/privacy`, terms: `${publicUrl}/terms` };
}

function open(url: string) {
  void WebBrowser.openBrowserAsync(url);
}

export function AgreementNote({ publicUrl }: { publicUrl: string }) {
  const urls = legalUrls(publicUrl);
  return (
    <Text className="mt-8 text-center font-sans text-meta text-ink-3">
      By continuing you agree to the{' '}
      <Text accessibilityRole="link" onPress={() => open(urls.terms)} className="font-semibold text-primary underline">
        Terms of use
      </Text>{' '}
      and{' '}
      <Text
        accessibilityRole="link"
        onPress={() => open(urls.privacy)}
        className="font-semibold text-primary underline"
      >
        Privacy policy
      </Text>
      .
    </Text>
  );
}

export function AboutSection({ publicUrl }: { publicUrl: string }) {
  const urls = legalUrls(publicUrl);
  const links = [
    { label: 'Privacy policy', url: urls.privacy },
    { label: 'Terms of use', url: urls.terms },
  ];
  return (
    <View className="gap-3">
      <SectionLabel>About</SectionLabel>
      <Card>
        {links.map((link, index) => (
          <Pressable
            key={link.url}
            accessibilityRole="link"
            onPress={() => open(link.url)}
            className={`min-h-tap justify-center px-5 py-4 ${index > 0 ? 'border-t border-line' : ''}`}
          >
            <Text className="font-semibold text-row-title text-ink">{link.label}</Text>
          </Pressable>
        ))}
      </Card>
    </View>
  );
}
