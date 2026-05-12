import {AudioSession} from '@livekit/react-native';
import React, {useEffect, useState} from 'react';
import {
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {assuranceColors} from './brand';

export type Props = {
  onSelect: () => void;
};

export const AudioOutputList = ({onSelect}: Props) => {
  const [audioOutputs, setAudioOutputs] = useState<string[]>([]);

  useEffect(() => {
    const loadAudioOutputs = async () => {
      const outputs = await AudioSession.getAudioOutputs();
      setAudioOutputs(outputs);
    };

    loadAudioOutputs();
  }, []);

  const selectOutput = async (deviceId: string) => {
    await AudioSession.selectAudioOutput(deviceId);
    onSelect();
  };

  const renderAudioOutput: ListRenderItem<string> = ({item}) => {
    return (
      <Pressable
        onPress={() => selectOutput(item)}
        style={({pressed}) => [styles.item, pressed && styles.itemPressed]}>
        <Text style={styles.itemText}>{item}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {audioOutputs.length > 0 ? (
        <FlatList
          data={audioOutputs}
          renderItem={renderAudioOutput}
          keyExtractor={item => item}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>未发现可切换的音频设备</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  list: {
    gap: 12,
  },
  item: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: assuranceColors.borderSoft,
    backgroundColor: assuranceColors.surfaceMuted,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  itemPressed: {
    transform: [{scale: 0.99}],
    opacity: 0.92,
  },
  itemText: {
    color: assuranceColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    minHeight: 88,
    borderRadius: 18,
    backgroundColor: assuranceColors.surfaceMuted,
    borderWidth: 1,
    borderColor: assuranceColors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  emptyText: {
    color: assuranceColors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
