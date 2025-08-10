# 📝 Creating New Screens - Step by Step Guide

Learn how to create new screens from scratch with all necessary files and configurations.

## 🎯 Overview

Creating a new screen involves **5 key files**:

1. **Template** → Screen structure and content
2. **Schema** → Validation rules
3. **Config** → Generated configuration (auto-created)
4. **Frontend Constant** → Screen name constant
5. **Route Definition** → Navigation setup

## 🚀 Step-by-Step Process

### Step 1: Define Screen Name

First, add your screen name to the constants file:

**File:** `Labor2Hire/src/constants/ScreenNames.ts`

```typescript
export const SCREEN_NAMES = {
  // Existing screens...
  CHOOSE_LANGUAGE: "ChooseLanguage",
  AUTH: "Auth",
  HOME: "Home",

  // Add your new screen
  PROFILE: "Profile", // 👈 Add this
  JOB_SEARCH: "JobSearch", // 👈 Add this
} as const;
```

### Step 2: Create Schema File

Create the validation schema for your screen:

**File:** `remote-config/schemas/Profile.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Profile Screen Configuration Schema",
  "type": "object",
  "required": ["screenType", "metadata", "components"],
  "properties": {
    "screenType": {
      "type": "string",
      "enum": ["Profile"]
    },
    "metadata": {
      "type": "object",
      "required": ["screenTitle", "description", "version", "lastUpdated"],
      "properties": {
        "screenTitle": { "type": "string" },
        "description": { "type": "string" },
        "version": { "type": "string" },
        "lastUpdated": { "type": "string" }
      }
    },
    "globalStyles": {
      "type": "object",
      "additionalProperties": true
    },
    "components": {
      "type": "array",
      "items": { "$ref": "#/definitions/Component" }
    },
    "loadingState": {
      "$ref": "#/definitions/Component"
    },
    "errorState": {
      "$ref": "#/definitions/Component"
    }
  },
  "definitions": {
    "Component": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "View",
            "Text",
            "Button",
            "TextInput",
            "ScrollView",
            "SafeAreaView",
            "TouchableOpacity",
            "Image",
            "ActivityIndicator"
          ]
        },
        "props": {
          "type": "object",
          "additionalProperties": true
        },
        "style": {
          "type": "object",
          "additionalProperties": true
        },
        "children": {
          "type": "array",
          "items": { "$ref": "#/definitions/Component" }
        },
        "actions": {
          "type": "object",
          "additionalProperties": true
        },
        "conditions": {
          "type": "object",
          "additionalProperties": true
        }
      }
    }
  },
  "additionalProperties": false
}
```

### Step 3: Create Template File

Create the screen template with your UI structure:

**File:** `remote-config/templates/Profile.template.json`

```json
{
  "screenType": "Profile",
  "metadata": {
    "screenTitle": "User Profile",
    "description": "User profile management screen",
    "version": "{{VERSION}}",
    "lastUpdated": "{{TIMESTAMP}}"
  },
  "globalStyles": {
    "backgroundColor": "#f8f9fa",
    "statusBar": {
      "barStyle": "dark-content",
      "backgroundColor": "#f8f9fa"
    }
  },
  "components": [
    {
      "type": "SafeAreaView",
      "style": {
        "flex": 1,
        "backgroundColor": "#f8f9fa"
      },
      "children": [
        {
          "type": "ScrollView",
          "style": {
            "flex": 1,
            "padding": 20
          },
          "children": [
            {
              "type": "View",
              "style": {
                "alignItems": "center",
                "marginBottom": 30
              },
              "children": [
                {
                  "type": "Image",
                  "props": {
                    "source": {
                      "uri": "https://via.placeholder.com/120"
                    }
                  },
                  "style": {
                    "width": 120,
                    "height": 120,
                    "borderRadius": 60,
                    "marginBottom": 15
                  }
                },
                {
                  "type": "Text",
                  "props": {
                    "text": "{{USER_NAME}}"
                  },
                  "style": {
                    "fontSize": 24,
                    "fontWeight": "bold",
                    "color": "#2c3e50",
                    "marginBottom": 5
                  }
                },
                {
                  "type": "Text",
                  "props": {
                    "text": "{{USER_EMAIL}}"
                  },
                  "style": {
                    "fontSize": 16,
                    "color": "#7f8c8d"
                  }
                }
              ]
            },
            {
              "type": "View",
              "style": {
                "backgroundColor": "#ffffff",
                "borderRadius": 12,
                "padding": 20,
                "marginBottom": 20
              },
              "children": [
                {
                  "type": "Text",
                  "props": {
                    "text": "Personal Information"
                  },
                  "style": {
                    "fontSize": 18,
                    "fontWeight": "bold",
                    "color": "#2c3e50",
                    "marginBottom": 15
                  }
                },
                {
                  "type": "TextInput",
                  "props": {
                    "placeholder": "Full Name",
                    "value": "{{USER_FULL_NAME}}"
                  },
                  "style": {
                    "borderWidth": 1,
                    "borderColor": "#ddd",
                    "borderRadius": 8,
                    "padding": 15,
                    "fontSize": 16,
                    "marginBottom": 15
                  }
                },
                {
                  "type": "TextInput",
                  "props": {
                    "placeholder": "Phone Number",
                    "value": "{{USER_PHONE}}",
                    "keyboardType": "phone-pad"
                  },
                  "style": {
                    "borderWidth": 1,
                    "borderColor": "#ddd",
                    "borderRadius": 8,
                    "padding": 15,
                    "fontSize": 16,
                    "marginBottom": 15
                  }
                }
              ]
            },
            {
              "type": "Button",
              "props": {
                "text": "Update Profile"
              },
              "style": {
                "backgroundColor": "#007bff",
                "color": "#ffffff",
                "padding": 15,
                "borderRadius": 8,
                "fontSize": 16,
                "fontWeight": "bold",
                "textAlign": "center",
                "marginBottom": 10
              },
              "actions": {
                "onPress": {
                  "type": "api_call",
                  "endpoint": "/api/user/update",
                  "method": "PUT",
                  "successMessage": "Profile updated successfully!"
                }
              }
            },
            {
              "type": "Button",
              "props": {
                "text": "Logout"
              },
              "style": {
                "backgroundColor": "#dc3545",
                "color": "#ffffff",
                "padding": 15,
                "borderRadius": 8,
                "fontSize": 16,
                "fontWeight": "bold",
                "textAlign": "center"
              },
              "actions": {
                "onPress": {
                  "type": "logout",
                  "confirmMessage": "Are you sure you want to logout?"
                }
              }
            }
          ]
        }
      ]
    }
  ],
  "loadingState": {
    "type": "SafeAreaView",
    "style": {
      "flex": 1,
      "justifyContent": "center",
      "alignItems": "center",
      "backgroundColor": "#f8f9fa"
    },
    "children": [
      {
        "type": "ActivityIndicator",
        "props": {
          "size": "large",
          "color": "#007bff"
        }
      },
      {
        "type": "Text",
        "props": {
          "text": "Loading profile..."
        },
        "style": {
          "marginTop": 15,
          "fontSize": 16,
          "color": "#7f8c8d"
        }
      }
    ]
  },
  "errorState": {
    "type": "SafeAreaView",
    "style": {
      "flex": 1,
      "justifyContent": "center",
      "alignItems": "center",
      "backgroundColor": "#f8f9fa",
      "padding": 20
    },
    "children": [
      {
        "type": "Text",
        "props": {
          "text": "Failed to load profile"
        },
        "style": {
          "fontSize": 18,
          "color": "#dc3545",
          "textAlign": "center",
          "marginBottom": 10
        }
      },
      {
        "type": "Button",
        "props": {
          "text": "Retry"
        },
        "style": {
          "backgroundColor": "#007bff",
          "color": "#ffffff",
          "padding": 12,
          "borderRadius": 8
        },
        "actions": {
          "onPress": {
            "type": "reload_screen"
          }
        }
      }
    ]
  }
}
```

### Step 4: Add Route Configuration

Add navigation route to your app config:

**File:** `remote-config/templates/App.template.json`

```json
{
  "navigation": {
    "initialRoute": "LanguageSelection",
    "routes": [
      {
        "name": "Profile",
        "component": "Profile",
        "options": {
          "title": "Profile",
          "headerShown": true,
          "headerBackVisible": true
        }
      }
    ]
  }
}
```

### Step 5: Register Screen in Backend

Add your screen to the config manager discovery:

**File:** `remote-config/configManager.js`

Find the `discoverScreens` method and ensure your screen is included:

```javascript
async discoverScreens() {
  const discoveredScreens = new Set();

  // Template files discovery
  const templateFiles = [
    'Auth.template.json',
    'Home.template.json',
    'Profile.template.json',     // 👈 Add this
    'ChooseLanguage.template.json'
  ];

  // Process template files...
}
```

## 🔧 Advanced Screen Features

### 1. **Dynamic Data Binding**

Use template variables for dynamic content:

```json
{
  "type": "Text",
  "props": {
    "text": "Welcome, {{USER_NAME}}!"
  },
  "conditions": {
    "if": {
      "operator": "not_empty",
      "field": "user.name"
    }
  }
}
```

### 2. **Conditional Rendering**

Show/hide components based on conditions:

```json
{
  "type": "Button",
  "props": {
    "text": "Admin Panel"
  },
  "conditions": {
    "if": {
      "operator": "equals",
      "field": "user.role",
      "value": "admin"
    }
  }
}
```

### 3. **Nested Layouts**

Create complex layouts with nested components:

```json
{
  "type": "View",
  "style": { "flexDirection": "row" },
  "children": [
    {
      "type": "View",
      "style": { "flex": 1, "marginRight": 10 },
      "children": [{ "type": "Text", "props": { "text": "Left Column" } }]
    },
    {
      "type": "View",
      "style": { "flex": 1, "marginLeft": 10 },
      "children": [{ "type": "Text", "props": { "text": "Right Column" } }]
    }
  ]
}
```

### 4. **Form Handling**

Create forms with validation:

```json
{
  "type": "TextInput",
  "props": {
    "placeholder": "Email",
    "keyboardType": "email-address",
    "autoCapitalize": "none"
  },
  "validation": {
    "required": true,
    "pattern": "email",
    "errorMessage": "Please enter a valid email"
  },
  "state": {
    "value": "user.email"
  }
}
```

## 🧪 Testing Your Screen

### 1. **Validate Schema**

```bash
npm run validate:schema Profile
```

### 2. **Test API Endpoint**

```bash
curl http://localhost:5001/api/config/screen/Profile
```

### 3. **Check WebSocket Update**

```bash
# Update a value and check if clients receive it
curl -X POST http://localhost:5001/api/config/update \
  -H "Content-Type: application/json" \
  -d '{"screen":"Profile","key":"metadata.screenTitle","value":"My Profile"}'
```

## 🚨 Common Issues & Solutions

### Issue 1: Screen Not Loading

```bash
# Check if schema is valid
npm run validate:schema Profile

# Check if template exists
ls remote-config/templates/Profile.template.json

# Check server logs
tail -f logs/application-*.log
```

### Issue 2: Components Not Rendering

- ✅ Check component type spelling
- ✅ Verify required props are provided
- ✅ Ensure style properties are valid
- ✅ Check parent-child relationship

### Issue 3: Actions Not Working

- ✅ Verify action type is supported
- ✅ Check action parameters
- ✅ Ensure proper event binding
- ✅ Check frontend action handlers

## 📋 Screen Creation Checklist

- [ ] ✅ Screen name added to `ScreenNames.ts`
- [ ] ✅ Schema file created in `schemas/`
- [ ] ✅ Template file created in `templates/`
- [ ] ✅ Route added to navigation config
- [ ] ✅ Screen registered in config manager
- [ ] ✅ Schema validation passes
- [ ] ✅ Template loads without errors
- [ ] ✅ Frontend can navigate to screen
- [ ] ✅ All components render correctly
- [ ] ✅ Actions work as expected
- [ ] ✅ Loading state displays properly
- [ ] ✅ Error state handles failures
- [ ] ✅ Real-time updates work

## 🎯 Best Practices

1. **📝 Descriptive Naming**: Use clear, descriptive screen names
2. **🔒 Schema Validation**: Always create comprehensive schemas
3. **📱 Responsive Design**: Design for different screen sizes
4. **♿ Accessibility**: Include accessibility properties
5. **⚡ Performance**: Optimize component hierarchy
6. **🛡️ Error Handling**: Implement proper error states
7. **🧪 Testing**: Test on multiple devices
8. **📚 Documentation**: Document screen purpose and features

---

## 🎉 Congratulations!

You've successfully created a new screen! Your screen will now:

- ✅ Load dynamically from backend configuration
- ✅ Update in real-time via WebSocket
- ✅ Validate against your schema
- ✅ Support all dynamic features

_Next: [Adding Components Guide](./08-adding-components.md)_
