// app/components/Button.tsx
import React from 'react';
import {
    StyleSheet,
    TouchableOpacity,
    Text,
    ActivityIndicator,
    View,
    StyleProp,
    ViewStyle,
    TextStyle
} from 'react-native';
import { spacing, borderRadius } from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { mapIoniconName } from '../utils/iconMapping';

export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'primary' | 'secondary';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode | string; // Can be a ReactNode or a string (icon name)
    iconPosition?: 'left' | 'right';
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    small?: boolean; // Added for backward compatibility
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'solid',
    size = 'md',
    fullWidth = false,
    disabled = false,
    loading = false,
    icon,
    iconPosition = 'left',
    style,
    textStyle,
    small = false, // Added for backward compatibility
}) => {
    const { colors } = useTheme();
    const mappedVariant: ButtonVariant =
    variant === 'primary' ? 'solid' :
    variant === 'secondary' ? 'outline' :
    variant;

// Use small prop if provided
const finalSize = small ? 'sm' : size;
    // Define dynamic styles based on the theme
    const dynamicStyles = {
        solid: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        solidDisabled: {
          backgroundColor: colors.surfaceVariant,
          borderColor: colors.surfaceVariant,
        },
        outline: {
          backgroundColor: 'transparent',
          borderColor: colors.primary,
        },
        outlineDisabled: {
          borderColor: colors.text.disabled,
        },
        ghost: {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        },
        solidText: {
          color: colors.text.inverse,
        },
        outlineText: {
          color: colors.primary,
        },
        ghostText: {
          color: colors.primary,
        },
        disabledText: {
          color: colors.text.disabled,
        },
      };

    const buttonStyles = [
        styles.button,
        styles[finalSize],
        mappedVariant === 'solid' && [styles.solid, dynamicStyles.solid],
        mappedVariant === 'outline' && [styles.outline, dynamicStyles.outline],
        mappedVariant === 'ghost' && [styles.ghost, dynamicStyles.ghost],
        fullWidth && styles.fullWidth,
        disabled && [
            styles.disabled,
            mappedVariant === 'solid' && dynamicStyles.solidDisabled,
            mappedVariant === 'outline' && dynamicStyles.outlineDisabled,
        ],
        style, // Allow overriding styles
    ];

    const textStyles = [
        styles.text,
        styles[`${finalSize}Text`], // Correctly use template literal
        mappedVariant === 'solid' && dynamicStyles.solidText,
        mappedVariant === 'outline' && dynamicStyles.outlineText,
        mappedVariant === 'ghost' && dynamicStyles.ghostText,
        disabled && dynamicStyles.disabledText,
        textStyle,  // Allow overriding text styles
    ];

    const renderContent = () => {
        if (loading) {
            return <ActivityIndicator color={mappedVariant === 'outline' || mappedVariant === 'ghost' ? colors.primary : colors.text.inverse} />;
        }

        const iconElement = icon && (
            <View style={[styles.iconContainer, iconPosition === 'right' && styles.iconRight]}>
              {typeof icon === 'string' ? (
                <Ionicons
                  name={mapIoniconName(icon as any)}
                  size={finalSize === 'sm' ? 16 : finalSize === 'md' ? 20 : 24}
                  color={mappedVariant === 'solid' ? colors.text.inverse : colors.primary}
                />
              ) : (
                icon
              )}
            </View>
          );

        return (
            <>
                {iconPosition === 'left' && iconElement}
                <Text style={textStyles}>{title}</Text>
                {iconPosition === 'right' && iconElement}
            </>
        );
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={buttonStyles}
            activeOpacity={0.8} // Add a bit of feedback on press
        >
            {renderContent()}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: borderRadius.md,
        borderWidth: 1,
    },
    solid: {
        // Colors are applied dynamically
    },
    outline: {
        // Colors are applied dynamically
    },
    ghost: {
      // Colors are applied dynamically
    },
    disabled: {
        // Colors are applied dynamically
    },
    sm: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
    },
    md: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    lg: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
    },
    fullWidth: {
        width: '100%',
    },
    text: {
        fontWeight: '500',
        fontSize: 16,
    },
    smText: {
        fontSize: 14,
    },
    mdText: {
      fontSize: 16,
    },
    lgText: {
        fontSize: 18,
    },
    iconContainer: {
        marginRight: spacing.xs,
    },
    iconRight: {
        marginRight: 0,
        marginLeft: spacing.xs,
    },
});

export default Button;