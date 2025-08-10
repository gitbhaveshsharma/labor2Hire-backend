# 🎨 Styling & Theming - Complete Styling Guide

Master the art of styling your dynamic UI components with comprehensive styling options and theming capabilities.

## 🎯 Styling Overview

The remote configuration system supports **React Native styling** with additional dynamic features:

- ✅ **Standard React Native styles** - All RN style properties
- ✅ **Dynamic theming** - Change themes instantly
- ✅ **Global styles** - Consistent styling across screens
- ✅ **Conditional styling** - Styles based on conditions
- ✅ **Template variables** - Dynamic style values
- ✅ **Responsive design** - Adapt to different screen sizes

## 🎨 Basic Styling

### Component Styling Structure

```json
{
  "type": "Button",
  "style": {
    "backgroundColor": "#007bff",
    "color": "#ffffff",
    "padding": 15,
    "borderRadius": 8,
    "fontSize": 16,
    "fontWeight": "bold",
    "textAlign": "center",
    "marginVertical": 10
  },
  "props": {
    "text": "Styled Button"
  }
}
```

### Style Inheritance

```json
{
  "type": "View",
  "style": {
    "backgroundColor": "#f8f9fa",
    "padding": 20
  },
  "children": [
    {
      "type": "Text",
      "style": {
        "color": "#2c3e50",
        "fontSize": 18
      },
      "props": {
        "text": "Inherits container styles"
      }
    }
  ]
}
```

## 🌈 Color System

### Primary Colors

```json
{
  "globalStyles": {
    "colors": {
      "primary": "#007bff",
      "secondary": "#6c757d",
      "success": "#28a745",
      "danger": "#dc3545",
      "warning": "#ffc107",
      "info": "#17a2b8",
      "light": "#f8f9fa",
      "dark": "#343a40"
    }
  }
}
```

### Using Colors in Components

```json
{
  "type": "Button",
  "style": {
    "backgroundColor": "{{colors.primary}}",
    "color": "#ffffff"
  },
  "props": {
    "text": "Primary Button"
  }
}
```

### Color Variations

```json
{
  "style": {
    "backgroundColor": "#007bff", // Solid color
    "borderColor": "#007bff", // Border color
    "shadowColor": "#007bff", // Shadow color
    "overlayColor": "rgba(0,123,255,0.1)" // Transparent overlay
  }
}
```

## 📏 Layout & Spacing

### Flexbox Layout

```json
{
  "type": "View",
  "style": {
    "flexDirection": "row",           // horizontal layout
    "justifyContent": "space-between", // distribute space
    "alignItems": "center",           // center vertically
    "flexWrap": "wrap",              // wrap to new line
    "flex": 1                        // take available space
  },
  "children": [
    {
      "type": "View",
      "style": { "flex": 1 },         // take 1/3 of space
      "children": [...]
    },
    {
      "type": "View",
      "style": { "flex": 2 },         // take 2/3 of space
      "children": [...]
    }
  ]
}
```

### Spacing System

```json
{
  "globalStyles": {
    "spacing": {
      "xs": 4,
      "sm": 8,
      "md": 16,
      "lg": 24,
      "xl": 32
    }
  }
}
```

### Using Spacing

```json
{
  "style": {
    "margin": "{{spacing.md}}", // 16px all sides
    "marginVertical": "{{spacing.sm}}", // 8px top/bottom
    "marginHorizontal": "{{spacing.lg}}", // 24px left/right
    "padding": "{{spacing.md}}", // 16px all sides
    "paddingTop": "{{spacing.xl}}" // 32px top only
  }
}
```

### Positioning

```json
{
  "style": {
    "position": "absolute",
    "top": 20,
    "right": 20,
    "zIndex": 10
  }
}
```

## 🔤 Typography System

### Font Configuration

```json
{
  "globalStyles": {
    "typography": {
      "fontFamily": {
        "regular": "System",
        "bold": "System-Bold",
        "light": "System-Light"
      },
      "fontSize": {
        "xs": 12,
        "sm": 14,
        "md": 16,
        "lg": 18,
        "xl": 20,
        "xxl": 24,
        "xxxl": 32
      },
      "lineHeight": {
        "tight": 1.2,
        "normal": 1.4,
        "loose": 1.6
      }
    }
  }
}
```

### Text Styling

```json
{
  "type": "Text",
  "style": {
    "fontSize": "{{typography.fontSize.lg}}",
    "fontWeight": "bold",
    "color": "{{colors.dark}}",
    "textAlign": "center",
    "lineHeight": "{{typography.lineHeight.normal}}",
    "letterSpacing": 0.5,
    "textDecorationLine": "underline",
    "fontStyle": "italic"
  },
  "props": {
    "text": "Styled Text"
  }
}
```

### Text Variations

```json
// Heading styles
{
  "type": "Text",
  "style": {
    "fontSize": 24,
    "fontWeight": "bold",
    "color": "#2c3e50",
    "marginBottom": 16
  },
  "props": { "text": "Heading" }
}

// Body text
{
  "type": "Text",
  "style": {
    "fontSize": 16,
    "color": "#495057",
    "lineHeight": 22
  },
  "props": { "text": "Body text" }
}

// Caption text
{
  "type": "Text",
  "style": {
    "fontSize": 12,
    "color": "#6c757d",
    "fontStyle": "italic"
  },
  "props": { "text": "Caption" }
}
```

## 🎁 Component Styling

### Button Styles

```json
// Primary button
{
  "type": "Button",
  "style": {
    "backgroundColor": "#007bff",
    "color": "#ffffff",
    "padding": 15,
    "borderRadius": 8,
    "fontSize": 16,
    "fontWeight": "bold",
    "textAlign": "center",
    "elevation": 2,
    "shadowColor": "#000000",
    "shadowOffset": { "width": 0, "height": 2 },
    "shadowOpacity": 0.1,
    "shadowRadius": 4
  }
}

// Outline button
{
  "type": "Button",
  "style": {
    "backgroundColor": "transparent",
    "color": "#007bff",
    "borderWidth": 2,
    "borderColor": "#007bff",
    "padding": 15,
    "borderRadius": 8
  }
}

// Disabled button
{
  "type": "Button",
  "style": {
    "backgroundColor": "#e9ecef",
    "color": "#6c757d",
    "padding": 15,
    "borderRadius": 8,
    "opacity": 0.6
  },
  "props": {
    "disabled": true
  }
}
```

### Input Field Styles

```json
{
  "type": "TextInput",
  "style": {
    "borderWidth": 1,
    "borderColor": "#ced4da",
    "borderRadius": 8,
    "padding": 15,
    "fontSize": 16,
    "backgroundColor": "#ffffff",
    "marginBottom": 15
  },
  "props": {
    "placeholder": "Enter text",
    "placeholderTextColor": "#6c757d"
  }
}

// Focused input style (can be applied conditionally)
{
  "style": {
    "borderColor": "#007bff",
    "borderWidth": 2,
    "shadowColor": "#007bff",
    "shadowOffset": { "width": 0, "height": 0 },
    "shadowOpacity": 0.1,
    "shadowRadius": 4
  }
}
```

### Card Styles

```json
{
  "type": "View",
  "style": {
    "backgroundColor": "#ffffff",
    "borderRadius": 12,
    "padding": 20,
    "marginVertical": 10,
    "elevation": 3,
    "shadowColor": "#000000",
    "shadowOffset": { "width": 0, "height": 2 },
    "shadowOpacity": 0.1,
    "shadowRadius": 8
  },
  "children": [
    // Card content
  ]
}
```

## 🌓 Dark Mode & Theming

### Theme Configuration

```json
{
  "globalStyles": {
    "themes": {
      "light": {
        "backgroundColor": "#ffffff",
        "textColor": "#2c3e50",
        "cardBackground": "#f8f9fa",
        "borderColor": "#dee2e6"
      },
      "dark": {
        "backgroundColor": "#1a1a1a",
        "textColor": "#ffffff",
        "cardBackground": "#2d3748",
        "borderColor": "#4a5568"
      }
    }
  }
}
```

### Using Theme Variables

```json
{
  "type": "View",
  "style": {
    "backgroundColor": "{{theme.backgroundColor}}",
    "flex": 1
  },
  "children": [
    {
      "type": "Text",
      "style": {
        "color": "{{theme.textColor}}",
        "fontSize": 18
      },
      "props": {
        "text": "Theme-aware text"
      }
    }
  ]
}
```

### Conditional Theme Styling

```json
{
  "type": "View",
  "style": {
    "backgroundColor": "#ffffff"
  },
  "conditions": {
    "if": {
      "operator": "equals",
      "field": "app.theme",
      "value": "light"
    }
  }
},
{
  "type": "View",
  "style": {
    "backgroundColor": "#1a1a1a"
  },
  "conditions": {
    "if": {
      "operator": "equals",
      "field": "app.theme",
      "value": "dark"
    }
  }
}
```

## 📱 Responsive Design

### Screen Size Variables

```json
{
  "globalStyles": {
    "breakpoints": {
      "small": 320,
      "medium": 768,
      "large": 1024
    }
  }
}
```

### Responsive Styling

```json
{
  "type": "View",
  "style": {
    "padding": 20
  },
  "responsiveStyle": {
    "small": {
      "padding": 10
    },
    "medium": {
      "padding": 20
    },
    "large": {
      "padding": 30
    }
  }
}
```

### Device-Specific Styles

```json
{
  "type": "Text",
  "style": {
    "fontSize": 16
  },
  "conditions": {
    "if": {
      "operator": "equals",
      "field": "device.type",
      "value": "tablet"
    },
    "then": {
      "style": {
        "fontSize": 20
      }
    }
  }
}
```

## ✨ Advanced Styling

### Animations

```json
{
  "type": "View",
  "style": {
    "transform": [{ "scale": 1 }],
    "opacity": 1
  },
  "animations": {
    "onLoad": {
      "type": "fadeIn",
      "duration": 300
    },
    "onPress": {
      "type": "scale",
      "from": 1,
      "to": 0.95,
      "duration": 100
    }
  }
}
```

### Gradients

```json
{
  "type": "LinearGradient",
  "props": {
    "colors": ["#007bff", "#0056b3"],
    "start": { "x": 0, "y": 0 },
    "end": { "x": 1, "y": 0 }
  },
  "style": {
    "padding": 20,
    "borderRadius": 12
  },
  "children": [
    {
      "type": "Text",
      "style": {
        "color": "#ffffff",
        "fontSize": 18,
        "fontWeight": "bold",
        "textAlign": "center"
      },
      "props": {
        "text": "Gradient Button"
      }
    }
  ]
}
```

### Borders & Shadows

```json
{
  "style": {
    // Border styles
    "borderWidth": 1,
    "borderColor": "#dee2e6",
    "borderRadius": 8,
    "borderStyle": "solid",

    // Different border sides
    "borderTopWidth": 2,
    "borderTopColor": "#007bff",

    // Shadow (iOS)
    "shadowColor": "#000000",
    "shadowOffset": { "width": 0, "height": 2 },
    "shadowOpacity": 0.1,
    "shadowRadius": 4,

    // Elevation (Android)
    "elevation": 3
  }
}
```

## 🎨 Style Patterns

### Form Styling

```json
{
  "type": "View",
  "style": {
    "backgroundColor": "#ffffff",
    "borderRadius": 12,
    "padding": 20,
    "margin": 20,
    "elevation": 2
  },
  "children": [
    {
      "type": "Text",
      "style": {
        "fontSize": 20,
        "fontWeight": "bold",
        "marginBottom": 20,
        "color": "#2c3e50"
      },
      "props": { "text": "Login Form" }
    },
    {
      "type": "TextInput",
      "style": {
        "borderWidth": 1,
        "borderColor": "#ced4da",
        "borderRadius": 8,
        "padding": 15,
        "marginBottom": 15,
        "fontSize": 16
      },
      "props": { "placeholder": "Email" }
    },
    {
      "type": "TextInput",
      "style": {
        "borderWidth": 1,
        "borderColor": "#ced4da",
        "borderRadius": 8,
        "padding": 15,
        "marginBottom": 20,
        "fontSize": 16
      },
      "props": {
        "placeholder": "Password",
        "secureTextEntry": true
      }
    },
    {
      "type": "Button",
      "style": {
        "backgroundColor": "#007bff",
        "color": "#ffffff",
        "padding": 15,
        "borderRadius": 8,
        "fontSize": 16,
        "fontWeight": "bold"
      },
      "props": { "text": "Login" }
    }
  ]
}
```

### List Item Styling

```json
{
  "type": "TouchableOpacity",
  "style": {
    "flexDirection": "row",
    "alignItems": "center",
    "backgroundColor": "#ffffff",
    "padding": 15,
    "marginVertical": 5,
    "marginHorizontal": 10,
    "borderRadius": 8,
    "elevation": 1,
    "shadowColor": "#000000",
    "shadowOffset": { "width": 0, "height": 1 },
    "shadowOpacity": 0.05,
    "shadowRadius": 2
  },
  "children": [
    {
      "type": "Image",
      "style": {
        "width": 50,
        "height": 50,
        "borderRadius": 25,
        "marginRight": 15
      },
      "props": {
        "source": { "uri": "{{item.avatar}}" }
      }
    },
    {
      "type": "View",
      "style": { "flex": 1 },
      "children": [
        {
          "type": "Text",
          "style": {
            "fontSize": 16,
            "fontWeight": "bold",
            "color": "#2c3e50",
            "marginBottom": 4
          },
          "props": { "text": "{{item.name}}" }
        },
        {
          "type": "Text",
          "style": {
            "fontSize": 14,
            "color": "#6c757d"
          },
          "props": { "text": "{{item.description}}" }
        }
      ]
    },
    {
      "type": "Icon",
      "props": {
        "name": "chevron-right",
        "size": 20,
        "color": "#6c757d"
      }
    }
  ]
}
```

## 🎯 Style System Reference

### Layout Properties

```json
{
  "style": {
    // Flexbox
    "flex": 1,
    "flexDirection": "row|column",
    "justifyContent": "flex-start|flex-end|center|space-between|space-around|space-evenly",
    "alignItems": "flex-start|flex-end|center|stretch|baseline",
    "alignSelf": "auto|flex-start|flex-end|center|stretch|baseline",
    "flexWrap": "nowrap|wrap|wrap-reverse",
    "flexGrow": 1,
    "flexShrink": 1,
    "flexBasis": "auto|number",

    // Position
    "position": "absolute|relative",
    "top": 0,
    "right": 0,
    "bottom": 0,
    "left": 0,
    "zIndex": 1,

    // Dimensions
    "width": 100,
    "height": 100,
    "minWidth": 50,
    "minHeight": 50,
    "maxWidth": 200,
    "maxHeight": 200
  }
}
```

### Spacing Properties

```json
{
  "style": {
    // Margin
    "margin": 10,
    "marginVertical": 10,
    "marginHorizontal": 10,
    "marginTop": 10,
    "marginRight": 10,
    "marginBottom": 10,
    "marginLeft": 10,

    // Padding
    "padding": 10,
    "paddingVertical": 10,
    "paddingHorizontal": 10,
    "paddingTop": 10,
    "paddingRight": 10,
    "paddingBottom": 10,
    "paddingLeft": 10
  }
}
```

### Visual Properties

```json
{
  "style": {
    // Background
    "backgroundColor": "#ffffff",
    "opacity": 0.8,

    // Border
    "borderWidth": 1,
    "borderColor": "#cccccc",
    "borderRadius": 8,
    "borderTopWidth": 1,
    "borderRightWidth": 1,
    "borderBottomWidth": 1,
    "borderLeftWidth": 1,
    "borderTopColor": "#cccccc",
    "borderRightColor": "#cccccc",
    "borderBottomColor": "#cccccc",
    "borderLeftColor": "#cccccc",
    "borderTopLeftRadius": 8,
    "borderTopRightRadius": 8,
    "borderBottomLeftRadius": 8,
    "borderBottomRightRadius": 8,
    "borderStyle": "solid|dotted|dashed",

    // Shadow (iOS)
    "shadowColor": "#000000",
    "shadowOffset": { "width": 0, "height": 2 },
    "shadowOpacity": 0.25,
    "shadowRadius": 4,

    // Elevation (Android)
    "elevation": 5
  }
}
```

### Text Properties

```json
{
  "style": {
    "color": "#333333",
    "fontSize": 16,
    "fontWeight": "normal|bold|100|200|300|400|500|600|700|800|900",
    "fontStyle": "normal|italic",
    "fontFamily": "System",
    "textAlign": "auto|left|right|center|justify",
    "textDecorationLine": "none|underline|line-through|underline line-through",
    "textDecorationStyle": "solid|double|dotted|dashed",
    "textDecorationColor": "#333333",
    "textShadowColor": "#000000",
    "textShadowOffset": { "width": 1, "height": 1 },
    "textShadowRadius": 1,
    "lineHeight": 20,
    "letterSpacing": 1,
    "textTransform": "none|capitalize|uppercase|lowercase"
  }
}
```

## 🛠️ Style Tools & Tips

### Style Debugging

```json
{
  "type": "View",
  "style": {
    "backgroundColor": "red", // Temporary - to see boundaries
    "borderWidth": 1, // Temporary - to see layout
    "borderColor": "blue" // Temporary - debug borders
  }
}
```

### Performance Tips

```json
// ✅ Good: Use specific properties
{
  "style": {
    "marginTop": 10,
    "marginBottom": 10
  }
}

// ❌ Avoid: Unnecessary complex styles
{
  "style": {
    "margin": 10,
    "marginLeft": 5,      // Overrides margin
    "marginRight": 5      // Overrides margin
  }
}
```

### Consistent Styling

```json
// Create reusable style variables
{
  "globalStyles": {
    "buttonPrimary": {
      "backgroundColor": "#007bff",
      "color": "#ffffff",
      "padding": 15,
      "borderRadius": 8,
      "fontSize": 16,
      "fontWeight": "bold"
    }
  }
}

// Use in components
{
  "type": "Button",
  "style": "{{buttonPrimary}}",
  "props": { "text": "Primary Button" }
}
```

---

## 🎉 You're Now a Styling Master!

With this comprehensive styling guide, you can:

- 🎨 **Create beautiful UIs** with consistent styling
- 🌈 **Implement theming** for light/dark modes
- 📱 **Design responsive layouts** for all devices
- ✨ **Add advanced effects** like animations and gradients
- 🎯 **Follow best practices** for performance and maintainability

_Next: [Actions & Navigation Guide](./10-actions-navigation.md)_
