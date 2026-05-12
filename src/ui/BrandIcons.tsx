import * as React from 'react';
import {Image, ImageSourcePropType, StyleSheet, View} from 'react-native';
import {assuranceColors} from './brand';

const videoCameraIcon = require('../icons/baseline_videocam_white_24dp.png');
const screenShareIcon = require('../icons/baseline_cast_white_24dp.png');

type BaseProps = {
  color?: string;
  size?: number;
};

type ImageIconProps = BaseProps & {
  source: ImageSourcePropType;
};

const ImageIcon = ({
  source,
  color = assuranceColors.primary,
  size = 26,
}: ImageIconProps) => {
  return (
    <Image
      source={source}
      resizeMode="contain"
      style={{width: size, height: size, tintColor: color}}
    />
  );
};

export const UserIcon = ({
  color = assuranceColors.primary,
  size = 22,
}: BaseProps) => {
  const headSize = size * 0.38;
  const bodyWidth = size * 0.74;
  const bodyHeight = size * 0.34;

  return (
    <View style={{width: size, height: size}}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.08,
          left: (size - headSize) / 2,
          width: headSize,
          height: headSize,
          borderWidth: Math.max(1.5, size * 0.08),
          borderColor: color,
          borderRadius: headSize / 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: (size - bodyWidth) / 2,
          bottom: size * 0.08,
          width: bodyWidth,
          height: bodyHeight,
          borderWidth: Math.max(1.5, size * 0.08),
          borderColor: color,
          borderRadius: bodyHeight / 2,
        }}
      />
    </View>
  );
};

export const BackIcon = ({
  color = assuranceColors.primary,
  size = 20,
}: BaseProps) => {
  const stroke = Math.max(2, size * 0.12);

  return (
    <View style={{width: size, height: size}}>
      <View
        style={[
          styles.arrowStem,
          {
            width: size * 0.62,
            left: size * 0.14,
            top: size * 0.47,
            height: stroke,
            backgroundColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.arrowPart,
          {
            width: size * 0.46,
            height: stroke,
            backgroundColor: color,
            left: size * 0.12,
            top: size * 0.29,
            transform: [{rotate: '-42deg'}],
          },
        ]}
      />
      <View
        style={[
          styles.arrowPart,
          {
            width: size * 0.46,
            height: stroke,
            backgroundColor: color,
            left: size * 0.12,
            top: size * 0.62,
            transform: [{rotate: '42deg'}],
          },
        ]}
      />
    </View>
  );
};

export const ShieldCheckIcon = ({
  color = assuranceColors.white,
  size = 18,
}: BaseProps) => {
  const stroke = Math.max(1.6, size * 0.1);

  return (
    <View style={{width: size, height: size * 1.1}}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: size * 0.14,
          width: size * 0.72,
          height: size * 0.5,
          borderTopLeftRadius: size * 0.22,
          borderTopRightRadius: size * 0.22,
          borderWidth: stroke,
          borderBottomWidth: 0,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.08,
          left: size * 0.28,
          width: size * 0.44,
          height: size * 0.44,
          borderLeftWidth: stroke,
          borderBottomWidth: stroke,
          borderRightWidth: stroke,
          borderColor: color,
          transform: [{rotate: '45deg'}],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.32,
          top: size * 0.46,
          width: size * 0.14,
          height: stroke,
          backgroundColor: color,
          transform: [{rotate: '45deg'}],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.4,
          top: size * 0.42,
          width: size * 0.28,
          height: stroke,
          backgroundColor: color,
          transform: [{rotate: '-40deg'}],
        }}
      />
    </View>
  );
};

export const VideoPlusIcon = ({
  color = assuranceColors.primary,
  size = 30,
}: BaseProps) => {
  return (
    <View style={{width: size + 12, height: size + 10}}>
      <ImageIcon source={videoCameraIcon} color={color} size={size} />
      <View
        style={{
          position: 'absolute',
          left: -2,
          top: -4,
          width: size * 0.42,
          height: size * 0.42,
          borderRadius: size * 0.21,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View
          style={{
            position: 'absolute',
            width: size * 0.18,
            height: size * 0.04,
            backgroundColor: assuranceColors.white,
            borderRadius: 999,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: size * 0.04,
            height: size * 0.18,
            backgroundColor: assuranceColors.white,
            borderRadius: 999,
          }}
        />
      </View>
    </View>
  );
};

export const DoorEnterIcon = ({
  color = assuranceColors.primary,
  size = 30,
}: BaseProps) => {
  const stroke = Math.max(1.8, size * 0.08);

  return (
    <View style={{width: size + 10, height: size}}>
      <View
        style={{
          position: 'absolute',
          left: size * 0.06,
          top: size * 0.08,
          width: size * 0.48,
          height: size * 0.84,
          borderWidth: stroke,
          borderColor: color,
          borderRadius: size * 0.14,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.28,
          top: size * 0.45,
          width: size * 0.08,
          height: size * 0.08,
          borderRadius: size * 0.04,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: size * 0.1,
          top: size * 0.46,
          width: size * 0.36,
          height: stroke,
          backgroundColor: color,
          borderRadius: 999,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: size * 0.08,
          top: size * 0.34,
          width: size * 0.2,
          height: stroke,
          backgroundColor: color,
          borderRadius: 999,
          transform: [{rotate: '40deg'}],
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: size * 0.08,
          top: size * 0.58,
          width: size * 0.2,
          height: stroke,
          backgroundColor: color,
          borderRadius: 999,
          transform: [{rotate: '-40deg'}],
        }}
      />
    </View>
  );
};

export const HomeIcon = ({
  color = assuranceColors.primary,
  size = 18,
}: BaseProps) => {
  const stroke = Math.max(1.8, size * 0.12);

  return (
    <View style={{width: size, height: size}}>
      <View
        style={{
          position: 'absolute',
          left: size * 0.18,
          bottom: size * 0.08,
          width: size * 0.64,
          height: size * 0.46,
          borderWidth: stroke,
          borderTopWidth: 0,
          borderColor: color,
          borderBottomLeftRadius: size * 0.14,
          borderBottomRightRadius: size * 0.14,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.12,
          top: size * 0.26,
          width: size * 0.42,
          height: stroke,
          backgroundColor: color,
          transform: [{rotate: '-36deg'}],
          borderRadius: 999,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: size * 0.12,
          top: size * 0.26,
          width: size * 0.42,
          height: stroke,
          backgroundColor: color,
          transform: [{rotate: '36deg'}],
          borderRadius: 999,
        }}
      />
    </View>
  );
};

export const ServicesIcon = ({
  color = assuranceColors.primary,
  size = 18,
}: BaseProps) => {
  const itemSize = size * 0.34;
  const gap = size * 0.12;

  return (
    <View style={{width: size, height: size}}>
      {[0, 1, 2, 3].map(index => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        return (
          <View
            key={index}
            style={{
              position: 'absolute',
              left: column * (itemSize + gap) + size * 0.1,
              top: row * (itemSize + gap) + size * 0.1,
              width: itemSize,
              height: itemSize,
              borderRadius: size * 0.09,
              borderWidth: Math.max(1.6, size * 0.1),
              borderColor: color,
            }}
          />
        );
      })}
    </View>
  );
};

export const MeetingScreenIcon = ({
  color = assuranceColors.primary,
  size = 24,
}: BaseProps) => {
  return <ImageIcon source={screenShareIcon} color={color} size={size} />;
};

const styles = StyleSheet.create({
  arrowStem: {
    position: 'absolute',
    borderRadius: 999,
  },
  arrowPart: {
    position: 'absolute',
    borderRadius: 999,
  },
});
