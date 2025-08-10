# 🧩 Adding Components - Complete Component Guide

Learn how to add, modify, and manage components in your dynamic UI system.

## 🎯 Component Basics

Every UI element is a **component** with three main parts:

1. **Type** → What component to render (Button, Text, View, etc.)
2. **Props** → Component properties (text, placeholder, etc.)
3. **Style** → Visual styling (colors, sizes, spacing, etc.)

## 🔘 Adding a Button

### Basic Button

```json
{
  "type": "Button",
  "props": {
    "text": "Click Me"
  },
  "style": {
    "backgroundColor": "#007bff",
    "color": "#ffffff",
    "padding": 15,
    "borderRadius": 8,
    "fontSize": 16,
    "fontWeight": "bold"
  }
}
```

### Button with Action

```json
{
  "type": "Button",
  "props": {
    "text": "Navigate to Home"
  },
  "style": {
    "backgroundColor": "#28a745",
    "color": "#ffffff",
    "padding": 15,
    "borderRadius": 8
  },
  "actions": {
    "onPress": {
      "type": "navigate",
      "target": "Home"
    }
  }
}
```

### Conditional Button

```json
{
  "type": "Button",
  "props": {
    "text": "Admin Only"
  },
  "style": {
    "backgroundColor": "#dc3545",
    "color": "#ffffff",
    "padding": 15
  },
  "conditions": {
    "if": {
      "operator": "equals",
      "field": "user.role",
      "value": "admin"
    }
  },
  "actions": {
    "onPress": {
      "type": "navigate",
      "target": "AdminPanel"
    }
  }
}
```

## 📝 Adding Text Components

### Simple Text

```json
{
  "type": "Text",
  "props": {
    "text": "Hello World"
  },
  "style": {
    "fontSize": 18,
    "color": "#333333",
    "textAlign": "center"
  }
}
```

### Dynamic Text with Variables

```json
{
  "type": "Text",
  "props": {
    "text": "Welcome back, {{USER_NAME}}!"
  },
  "style": {
    "fontSize": 20,
    "fontWeight": "bold",
    "color": "#2c3e50",
    "marginBottom": 10
  }
}
```

### Formatted Text

```json
{
  "type": "Text",
  "props": {
    "text": "Terms and Conditions"
  },
  "style": {
    "fontSize": 14,
    "color": "#007bff",
    "textDecorationLine": "underline"
  },
  "actions": {
    "onPress": {
      "type": "navigate",
      "target": "TermsAndConditions"
    }
  }
}
```

## 📥 Adding Input Fields

### Basic Text Input

```json
{
  "type": "TextInput",
  "props": {
    "placeholder": "Enter your email",
    "keyboardType": "email-address",
    "autoCapitalize": "none",
    "autoCorrect": false
  },
  "style": {
    "borderWidth": 1,
    "borderColor": "#ddd",
    "borderRadius": 8,
    "padding": 15,
    "fontSize": 16,
    "marginBottom": 15
  },
  "state": {
    "value": "user.email"
  }
}
```

### Password Input

```json
{
  "type": "TextInput",
  "props": {
    "placeholder": "Password",
    "secureTextEntry": true,
    "autoCapitalize": "none"
  },
  "style": {
    "borderWidth": 1,
    "borderColor": "#ddd",
    "borderRadius": 8,
    "padding": 15,
    "fontSize": 16,
    "marginBottom": 15
  },
  "state": {
    "value": "user.password"
  },
  "validation": {
    "required": true,
    "minLength": 8,
    "errorMessage": "Password must be at least 8 characters"
  }
}
```

### Search Input with Icon

```json
{
  "type": "View",
  "style": {
    "flexDirection": "row",
    "alignItems": "center",
    "borderWidth": 1,
    "borderColor": "#ddd",
    "borderRadius": 8,
    "paddingHorizontal": 15
  },
  "children": [
    {
      "type": "Icon",
      "props": {
        "name": "search",
        "size": 20,
        "color": "#7f8c8d"
      }
    },
    {
      "type": "TextInput",
      "props": {
        "placeholder": "Search jobs...",
        "autoCapitalize": "none"
      },
      "style": {
        "flex": 1,
        "padding": 15,
        "fontSize": 16
      },
      "state": {
        "value": "search.query"
      }
    }
  ]
}
```

## 🖼️ Adding Images

### Static Image

```json
{
  "type": "Image",
  "props": {
    "source": {
      "uri": "https://example.com/logo.png"
    },
    "resizeMode": "contain"
  },
  "style": {
    "width": 200,
    "height": 100,
    "alignSelf": "center",
    "marginBottom": 20
  }
}
```

### Profile Avatar

```json
{
  "type": "Image",
  "props": {
    "source": {
      "uri": "{{USER_AVATAR_URL}}"
    },
    "defaultSource": {
      "uri": "https://via.placeholder.com/100"
    }
  },
  "style": {
    "width": 100,
    "height": 100,
    "borderRadius": 50,
    "borderWidth": 3,
    "borderColor": "#007bff"
  }
}
```

### Touchable Image

```json
{
  "type": "TouchableOpacity",
  "actions": {
    "onPress": {
      "type": "image_picker",
      "options": {
        "mediaType": "photo",
        "quality": 0.8
      }
    }
  },
  "children": [
    {
      "type": "Image",
      "props": {
        "source": {
          "uri": "{{USER_AVATAR_URL}}"
        }
      },
      "style": {
        "width": 120,
        "height": 120,
        "borderRadius": 60
      }
    },
    {
      "type": "View",
      "style": {
        "position": "absolute",
        "bottom": 0,
        "right": 0,
        "backgroundColor": "#007bff",
        "borderRadius": 15,
        "width": 30,
        "height": 30,
        "justifyContent": "center",
        "alignItems": "center"
      },
      "children": [
        {
          "type": "Icon",
          "props": {
            "name": "camera",
            "size": 16,
            "color": "#ffffff"
          }
        }
      ]
    }
  ]
}
```

## 📋 Adding Lists

### Simple List

```json
{
  "type": "FlatList",
  "props": {
    "data": "{{JOB_LISTINGS}}",
    "keyExtractor": "id"
  },
  "style": {
    "flex": 1
  },
  "itemTemplate": {
    "type": "TouchableOpacity",
    "style": {
      "backgroundColor": "#ffffff",
      "padding": 15,
      "marginVertical": 5,
      "marginHorizontal": 10,
      "borderRadius": 8,
      "elevation": 2
    },
    "actions": {
      "onPress": {
        "type": "navigate",
        "target": "JobDetails",
        "params": {
          "jobId": "{{item.id}}"
        }
      }
    },
    "children": [
      {
        "type": "Text",
        "props": {
          "text": "{{item.title}}"
        },
        "style": {
          "fontSize": 18,
          "fontWeight": "bold",
          "color": "#2c3e50",
          "marginBottom": 5
        }
      },
      {
        "type": "Text",
        "props": {
          "text": "{{item.company}}"
        },
        "style": {
          "fontSize": 14,
          "color": "#7f8c8d",
          "marginBottom": 5
        }
      },
      {
        "type": "Text",
        "props": {
          "text": "${{item.salary}}/hour"
        },
        "style": {
          "fontSize": 16,
          "color": "#28a745",
          "fontWeight": "bold"
        }
      }
    ]
  }
}
```

### Grid List

```json
{
  "type": "FlatList",
  "props": {
    "data": "{{CATEGORIES}}",
    "numColumns": 2,
    "keyExtractor": "id"
  },
  "style": {
    "flex": 1,
    "padding": 10
  },
  "itemTemplate": {
    "type": "TouchableOpacity",
    "style": {
      "flex": 1,
      "backgroundColor": "#ffffff",
      "margin": 5,
      "padding": 20,
      "borderRadius": 12,
      "alignItems": "center",
      "elevation": 2
    },
    "actions": {
      "onPress": {
        "type": "navigate",
        "target": "CategoryJobs",
        "params": {
          "categoryId": "{{item.id}}"
        }
      }
    },
    "children": [
      {
        "type": "Icon",
        "props": {
          "name": "{{item.icon}}",
          "size": 40,
          "color": "{{item.color}}"
        },
        "style": {
          "marginBottom": 10
        }
      },
      {
        "type": "Text",
        "props": {
          "text": "{{item.name}}"
        },
        "style": {
          "fontSize": 14,
          "fontWeight": "bold",
          "textAlign": "center",
          "color": "#2c3e50"
        }
      }
    ]
  }
}
```

## 📦 Adding Layout Components

### Container View

```json
{
  "type": "View",
  "style": {
    "flex": 1,
    "backgroundColor": "#f8f9fa",
    "padding": 20
  },
  "children": [
    // Child components here
  ]
}
```

### Card Layout

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
    "shadowOffset": {
      "width": 0,
      "height": 2
    },
    "shadowOpacity": 0.1,
    "shadowRadius": 4
  },
  "children": [
    {
      "type": "Text",
      "props": {
        "text": "Card Title"
      },
      "style": {
        "fontSize": 18,
        "fontWeight": "bold",
        "marginBottom": 10
      }
    },
    {
      "type": "Text",
      "props": {
        "text": "Card content goes here..."
      },
      "style": {
        "fontSize": 14,
        "color": "#7f8c8d"
      }
    }
  ]
}
```

### Flex Row Layout

```json
{
  "type": "View",
  "style": {
    "flexDirection": "row",
    "justifyContent": "space-between",
    "alignItems": "center",
    "padding": 15
  },
  "children": [
    {
      "type": "Text",
      "props": {
        "text": "Left Content"
      },
      "style": {
        "flex": 1,
        "fontSize": 16
      }
    },
    {
      "type": "Button",
      "props": {
        "text": "Action"
      },
      "style": {
        "backgroundColor": "#007bff",
        "color": "#ffffff",
        "padding": 10,
        "borderRadius": 6
      }
    }
  ]
}
```

## 🔄 Adding Loading & Status Components

### Loading Spinner

```json
{
  "type": "ActivityIndicator",
  "props": {
    "size": "large",
    "color": "#007bff"
  },
  "style": {
    "marginVertical": 20
  }
}
```

### Progress Bar

```json
{
  "type": "View",
  "style": {
    "height": 4,
    "backgroundColor": "#e9ecef",
    "borderRadius": 2,
    "marginVertical": 10
  },
  "children": [
    {
      "type": "View",
      "style": {
        "height": "100%",
        "width": "{{PROGRESS_PERCENTAGE}}%",
        "backgroundColor": "#007bff",
        "borderRadius": 2
      }
    }
  ]
}
```

### Status Badge

```json
{
  "type": "View",
  "style": {
    "backgroundColor": "{{STATUS_COLOR}}",
    "paddingHorizontal": 12,
    "paddingVertical": 6,
    "borderRadius": 12,
    "alignSelf": "flex-start"
  },
  "children": [
    {
      "type": "Text",
      "props": {
        "text": "{{STATUS_TEXT}}"
      },
      "style": {
        "fontSize": 12,
        "color": "#ffffff",
        "fontWeight": "bold"
      }
    }
  ]
}
```

## 🎛️ Adding Form Components

### Dropdown/Picker

```json
{
  "type": "Picker",
  "props": {
    "selectedValue": "{{SELECTED_COUNTRY}}",
    "items": "{{COUNTRY_LIST}}"
  },
  "style": {
    "borderWidth": 1,
    "borderColor": "#ddd",
    "borderRadius": 8,
    "marginBottom": 15
  },
  "actions": {
    "onValueChange": {
      "type": "update_state",
      "field": "user.country"
    }
  }
}
```

### Switch/Toggle

```json
{
  "type": "View",
  "style": {
    "flexDirection": "row",
    "justifyContent": "space-between",
    "alignItems": "center",
    "paddingVertical": 15
  },
  "children": [
    {
      "type": "Text",
      "props": {
        "text": "Enable Notifications"
      },
      "style": {
        "fontSize": 16,
        "color": "#2c3e50"
      }
    },
    {
      "type": "Switch",
      "props": {
        "value": "{{NOTIFICATIONS_ENABLED}}",
        "trackColor": {
          "false": "#d3d3d3",
          "true": "#007bff"
        },
        "thumbColor": "#ffffff"
      },
      "actions": {
        "onValueChange": {
          "type": "update_setting",
          "setting": "notifications_enabled"
        }
      }
    }
  ]
}
```

### Radio Button Group

```json
{
  "type": "View",
  "style": {
    "marginVertical": 15
  },
  "children": [
    {
      "type": "Text",
      "props": {
        "text": "Job Type"
      },
      "style": {
        "fontSize": 16,
        "fontWeight": "bold",
        "marginBottom": 10
      }
    },
    {
      "type": "RadioGroup",
      "props": {
        "options": [
          { "value": "full-time", "label": "Full Time" },
          { "value": "part-time", "label": "Part Time" },
          { "value": "contract", "label": "Contract" }
        ],
        "selectedValue": "{{SELECTED_JOB_TYPE}}"
      },
      "actions": {
        "onSelectionChange": {
          "type": "update_filter",
          "field": "jobType"
        }
      }
    }
  ]
}
```

## 🔧 Component Properties Reference

### Common Props for All Components

```json
{
  "type": "ComponentType",
  "props": {
    // Component-specific properties
  },
  "style": {
    // React Native style properties
  },
  "actions": {
    // Event handlers
  },
  "conditions": {
    // Conditional rendering
  },
  "state": {
    // State binding
  },
  "validation": {
    // Validation rules (for inputs)
  }
}
```

### Text Component Props

```json
{
  "type": "Text",
  "props": {
    "text": "string",
    "numberOfLines": "number",
    "ellipsizeMode": "head|middle|tail|clip",
    "selectable": "boolean",
    "adjustsFontSizeToFit": "boolean"
  }
}
```

### Button Component Props

```json
{
  "type": "Button",
  "props": {
    "text": "string",
    "disabled": "boolean",
    "color": "string"
  }
}
```

### TextInput Component Props

```json
{
  "type": "TextInput",
  "props": {
    "placeholder": "string",
    "placeholderTextColor": "string",
    "value": "string",
    "secureTextEntry": "boolean",
    "keyboardType": "default|numeric|email-address|phone-pad",
    "autoCapitalize": "none|sentences|words|characters",
    "autoCorrect": "boolean",
    "multiline": "boolean",
    "numberOfLines": "number",
    "maxLength": "number"
  }
}
```

### Image Component Props

```json
{
  "type": "Image",
  "props": {
    "source": {
      "uri": "string"
    },
    "defaultSource": {
      "uri": "string"
    },
    "resizeMode": "cover|contain|stretch|repeat|center",
    "loadingIndicatorSource": {
      "uri": "string"
    }
  }
}
```

## 🎨 Styling Properties

### Layout Styles

```json
{
  "style": {
    "flex": 1,
    "flexDirection": "row|column",
    "justifyContent": "flex-start|flex-end|center|space-between|space-around|space-evenly",
    "alignItems": "flex-start|flex-end|center|stretch|baseline",
    "alignSelf": "auto|flex-start|flex-end|center|stretch|baseline",
    "position": "absolute|relative",
    "top": 10,
    "right": 10,
    "bottom": 10,
    "left": 10,
    "zIndex": 1
  }
}
```

### Spacing Styles

```json
{
  "style": {
    "margin": 10,
    "marginVertical": 10,
    "marginHorizontal": 10,
    "marginTop": 10,
    "marginRight": 10,
    "marginBottom": 10,
    "marginLeft": 10,
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

### Border Styles

```json
{
  "style": {
    "borderWidth": 1,
    "borderTopWidth": 1,
    "borderRightWidth": 1,
    "borderBottomWidth": 1,
    "borderLeftWidth": 1,
    "borderColor": "#cccccc",
    "borderTopColor": "#cccccc",
    "borderRightColor": "#cccccc",
    "borderBottomColor": "#cccccc",
    "borderLeftColor": "#cccccc",
    "borderRadius": 8,
    "borderTopLeftRadius": 8,
    "borderTopRightRadius": 8,
    "borderBottomLeftRadius": 8,
    "borderBottomRightRadius": 8
  }
}
```

### Text Styles

```json
{
  "style": {
    "fontSize": 16,
    "fontWeight": "normal|bold|100|200|300|400|500|600|700|800|900",
    "fontStyle": "normal|italic",
    "color": "#333333",
    "textAlign": "auto|left|right|center|justify",
    "textDecorationLine": "none|underline|line-through|underline line-through",
    "lineHeight": 20,
    "letterSpacing": 1
  }
}
```

### Background & Shadow Styles

```json
{
  "style": {
    "backgroundColor": "#ffffff",
    "opacity": 0.8,
    "elevation": 5,
    "shadowColor": "#000000",
    "shadowOffset": {
      "width": 0,
      "height": 2
    },
    "shadowOpacity": 0.25,
    "shadowRadius": 4
  }
}
```

## 🔧 Modifying Existing Components

### Find Component in Template

1. Open template file: `templates/ScreenName.template.json`
2. Search for component by type or text
3. Modify properties as needed

### Example: Change Button Color

**Before:**

```json
{
  "type": "Button",
  "props": {
    "text": "Login"
  },
  "style": {
    "backgroundColor": "#007bff"
  }
}
```

**After:**

```json
{
  "type": "Button",
  "props": {
    "text": "Login"
  },
  "style": {
    "backgroundColor": "#28a745" // Changed to green
  }
}
```

### Update Schema if Needed

If you add new component types or properties, update the schema:

**File:** `schemas/ScreenName.schema.json`

```json
{
  "definitions": {
    "Component": {
      "properties": {
        "type": {
          "enum": [
            "View",
            "Text",
            "Button",
            "TextInput",
            "NewComponentType" // Add new component type
          ]
        }
      }
    }
  }
}
```

## 🧪 Testing Components

### 1. **Schema Validation**

```bash
npm run validate:schema ScreenName
```

### 2. **Live Testing**

Save your template file and check the app for immediate updates.

### 3. **API Testing**

```bash
curl http://localhost:5001/api/config/screen/ScreenName
```

## 📋 Component Addition Checklist

- [ ] ✅ Component type is supported in frontend
- [ ] ✅ Required props are provided
- [ ] ✅ Style properties are valid
- [ ] ✅ Actions are properly configured
- [ ] ✅ State binding is correct (if applicable)
- [ ] ✅ Validation rules are set (for inputs)
- [ ] ✅ Conditions work as expected
- [ ] ✅ Schema allows the component
- [ ] ✅ Component renders correctly
- [ ] ✅ Interactions work as intended

---

## 🎉 You're a Component Master!

You now know how to add any component to your dynamic UI system. Remember:

- 🎯 **Keep it simple**: Start with basic components
- 🧪 **Test often**: Validate changes immediately
- 📝 **Document changes**: Update schemas when needed
- 🎨 **Be consistent**: Follow design patterns

_Next: [Styling & Theming Guide](./09-styling-theming.md)_
