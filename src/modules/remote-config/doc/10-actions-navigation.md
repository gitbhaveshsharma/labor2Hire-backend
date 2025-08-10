# ⚡ Actions & Navigation - Interactive UI Guide

Learn how to add interactivity to your dynamic UI with actions, navigation, and user interactions.

## 🎯 Actions Overview

Actions define **what happens** when users interact with components. The system supports:

- 🔄 **Navigation** - Move between screens
- 📡 **API Calls** - Send data to backend
- 💾 **State Updates** - Modify app state
- 🔔 **Notifications** - Show alerts/toasts
- 📱 **Device Actions** - Camera, phone, etc.
- 🎛️ **Custom Actions** - App-specific logic

## 🚀 Basic Action Structure

### Action Definition Format

```json
{
  "type": "Button",
  "props": {
    "text": "Click Me"
  },
  "actions": {
    "onPress": {
      // Event trigger
      "type": "action_type", // What action to perform
      "param1": "value1", // Action parameters
      "param2": "value2"
    }
  }
}
```

### Multiple Actions

```json
{
  "actions": {
    "onPress": [
      // Multiple actions on single event
      {
        "type": "analytics",
        "event": "button_clicked",
        "properties": { "button_id": "login" }
      },
      {
        "type": "navigate",
        "target": "Home"
      }
    ]
  }
}
```

## 🗺️ Navigation Actions

### Basic Navigation

```json
{
  "type": "Button",
  "props": {
    "text": "Go to Profile"
  },
  "actions": {
    "onPress": {
      "type": "navigate",
      "target": "Profile"
    }
  }
}
```

### Navigation with Parameters

```json
{
  "type": "Button",
  "props": {
    "text": "View Job Details"
  },
  "actions": {
    "onPress": {
      "type": "navigate",
      "target": "JobDetails",
      "params": {
        "jobId": "{{item.id}}",
        "jobTitle": "{{item.title}}",
        "source": "home_screen"
      }
    }
  }
}
```

### Navigation Types

```json
// Standard navigation (can go back)
{
  "type": "navigate",
  "target": "Profile"
}

// Replace current screen (can't go back)
{
  "type": "replace",
  "target": "Home"
}

// Reset navigation stack (clear history)
{
  "type": "reset",
  "target": "Auth"
}

// Go back to previous screen
{
  "type": "goBack"
}

// Go back to specific screen
{
  "type": "goBack",
  "target": "Home"
}

// Pop to top of stack
{
  "type": "popToTop"
}
```

### Conditional Navigation

```json
{
  "type": "Button",
  "props": {
    "text": "Continue"
  },
  "actions": {
    "onPress": {
      "type": "conditional_navigate",
      "conditions": [
        {
          "if": {
            "operator": "equals",
            "field": "user.isLoggedIn",
            "value": true
          },
          "then": {
            "type": "navigate",
            "target": "Home"
          }
        },
        {
          "else": {
            "type": "navigate",
            "target": "Auth"
          }
        }
      ]
    }
  }
}
```

## 📡 API Actions

### GET Request

```json
{
  "type": "Button",
  "props": {
    "text": "Load Profile"
  },
  "actions": {
    "onPress": {
      "type": "api_call",
      "method": "GET",
      "endpoint": "/api/user/profile",
      "headers": {
        "Authorization": "Bearer {{user.token}}"
      },
      "onSuccess": {
        "type": "update_state",
        "field": "user.profile",
        "value": "{{response.data}}"
      },
      "onError": {
        "type": "alert",
        "title": "Error",
        "message": "Failed to load profile"
      }
    }
  }
}
```

### POST Request

```json
{
  "type": "Button",
  "props": {
    "text": "Update Profile"
  },
  "actions": {
    "onPress": {
      "type": "api_call",
      "method": "POST",
      "endpoint": "/api/user/update",
      "headers": {
        "Content-Type": "application/json",
        "Authorization": "Bearer {{user.token}}"
      },
      "body": {
        "name": "{{form.name}}",
        "email": "{{form.email}}",
        "phone": "{{form.phone}}"
      },
      "loadingMessage": "Updating profile...",
      "onSuccess": [
        {
          "type": "update_state",
          "field": "user.profile",
          "value": "{{response.data}}"
        },
        {
          "type": "toast",
          "message": "Profile updated successfully!",
          "type": "success"
        },
        {
          "type": "goBack"
        }
      ],
      "onError": {
        "type": "alert",
        "title": "Update Failed",
        "message": "{{error.message}}"
      }
    }
  }
}
```

### File Upload

```json
{
  "type": "Button",
  "props": {
    "text": "Upload Avatar"
  },
  "actions": {
    "onPress": {
      "type": "image_picker",
      "options": {
        "mediaType": "photo",
        "quality": 0.8,
        "allowsEditing": true
      },
      "onSuccess": {
        "type": "api_call",
        "method": "POST",
        "endpoint": "/api/user/upload-avatar",
        "headers": {
          "Content-Type": "multipart/form-data",
          "Authorization": "Bearer {{user.token}}"
        },
        "files": {
          "avatar": "{{selected_image}}"
        },
        "onSuccess": {
          "type": "update_state",
          "field": "user.avatar",
          "value": "{{response.avatar_url}}"
        }
      }
    }
  }
}
```

## 💾 State Management Actions

### Update State

```json
{
  "type": "Switch",
  "props": {
    "value": "{{settings.notifications}}"
  },
  "actions": {
    "onValueChange": {
      "type": "update_state",
      "field": "settings.notifications",
      "value": "{{event.value}}"
    }
  }
}
```

### Multiple State Updates

```json
{
  "type": "Button",
  "props": {
    "text": "Reset Form"
  },
  "actions": {
    "onPress": {
      "type": "update_multiple_states",
      "updates": {
        "form.name": "",
        "form.email": "",
        "form.phone": "",
        "form.errors": {}
      }
    }
  }
}
```

### Store to Local Storage

```json
{
  "type": "Button",
  "props": {
    "text": "Save Preferences"
  },
  "actions": {
    "onPress": {
      "type": "store_local",
      "key": "user_preferences",
      "value": {
        "theme": "{{app.theme}}",
        "language": "{{app.language}}",
        "notifications": "{{settings.notifications}}"
      }
    }
  }
}
```

## 🔔 User Feedback Actions

### Alert Dialog

```json
{
  "type": "Button",
  "props": {
    "text": "Delete Account"
  },
  "actions": {
    "onPress": {
      "type": "alert",
      "title": "Delete Account",
      "message": "Are you sure you want to delete your account? This action cannot be undone.",
      "buttons": [
        {
          "text": "Cancel",
          "style": "cancel"
        },
        {
          "text": "Delete",
          "style": "destructive",
          "action": {
            "type": "api_call",
            "method": "DELETE",
            "endpoint": "/api/user/delete"
          }
        }
      ]
    }
  }
}
```

### Toast Notifications

```json
{
  "type": "Button",
  "props": {
    "text": "Save Changes"
  },
  "actions": {
    "onPress": [
      {
        "type": "api_call",
        "method": "POST",
        "endpoint": "/api/save"
      },
      {
        "type": "toast",
        "message": "Changes saved successfully!",
        "duration": 3000,
        "position": "bottom",
        "type": "success"
      }
    ]
  }
}
```

### Loading States

```json
{
  "type": "Button",
  "props": {
    "text": "Submit"
  },
  "actions": {
    "onPress": {
      "type": "api_call",
      "method": "POST",
      "endpoint": "/api/submit",
      "loadingState": {
        "type": "update_state",
        "field": "ui.isSubmitting",
        "value": true
      },
      "onComplete": {
        "type": "update_state",
        "field": "ui.isSubmitting",
        "value": false
      }
    }
  }
}
```

## 📱 Device Actions

### Camera & Photo Picker

```json
{
  "type": "Button",
  "props": {
    "text": "Take Photo"
  },
  "actions": {
    "onPress": {
      "type": "camera",
      "options": {
        "cameraType": "back",
        "quality": 0.8
      },
      "onSuccess": {
        "type": "update_state",
        "field": "form.photo",
        "value": "{{captured_image}}"
      }
    }
  }
}

{
  "type": "Button",
  "props": {
    "text": "Choose from Gallery"
  },
  "actions": {
    "onPress": {
      "type": "image_picker",
      "options": {
        "mediaType": "photo",
        "allowsEditing": true,
        "quality": 0.8
      },
      "onSuccess": {
        "type": "update_state",
        "field": "form.photo",
        "value": "{{selected_image}}"
      }
    }
  }
}
```

### Phone & Communication

```json
{
  "type": "Button",
  "props": {
    "text": "Call Support"
  },
  "actions": {
    "onPress": {
      "type": "phone_call",
      "number": "+1-800-555-0123"
    }
  }
}

{
  "type": "Button",
  "props": {
    "text": "Send SMS"
  },
  "actions": {
    "onPress": {
      "type": "sms",
      "number": "+1-800-555-0123",
      "message": "Hello from Labor2Hire app!"
    }
  }
}

{
  "type": "Button",
  "props": {
    "text": "Send Email"
  },
  "actions": {
    "onPress": {
      "type": "email",
      "to": "support@labor2hire.com",
      "subject": "Support Request",
      "body": "I need help with..."
    }
  }
}
```

### Location Services

```json
{
  "type": "Button",
  "props": {
    "text": "Get Current Location"
  },
  "actions": {
    "onPress": {
      "type": "get_location",
      "accuracy": "high",
      "timeout": 10000,
      "onSuccess": {
        "type": "update_state",
        "field": "user.location",
        "value": "{{location}}"
      },
      "onError": {
        "type": "alert",
        "title": "Location Error",
        "message": "Unable to get your location"
      }
    }
  }
}
```

## 🎛️ Form Actions

### Form Validation

```json
{
  "type": "TextInput",
  "props": {
    "placeholder": "Email"
  },
  "actions": {
    "onChangeText": {
      "type": "validate_field",
      "field": "email",
      "value": "{{event.text}}",
      "rules": [
        {
          "type": "required",
          "message": "Email is required"
        },
        {
          "type": "email",
          "message": "Please enter a valid email"
        }
      ],
      "onValid": {
        "type": "update_state",
        "field": "form.email",
        "value": "{{event.text}}"
      },
      "onInvalid": {
        "type": "update_state",
        "field": "form.errors.email",
        "value": "{{validation_error}}"
      }
    }
  }
}
```

### Form Submission

```json
{
  "type": "Button",
  "props": {
    "text": "Submit Form"
  },
  "actions": {
    "onPress": {
      "type": "validate_form",
      "fields": ["name", "email", "phone"],
      "onValid": {
        "type": "api_call",
        "method": "POST",
        "endpoint": "/api/form/submit",
        "body": {
          "name": "{{form.name}}",
          "email": "{{form.email}}",
          "phone": "{{form.phone}}"
        }
      },
      "onInvalid": {
        "type": "alert",
        "title": "Form Error",
        "message": "Please fix the errors and try again"
      }
    }
  }
}
```

## 🔄 Advanced Actions

### Chained Actions

```json
{
  "type": "Button",
  "props": {
    "text": "Complete Registration"
  },
  "actions": {
    "onPress": {
      "type": "chain",
      "actions": [
        {
          "type": "validate_form",
          "fields": ["email", "password", "name"]
        },
        {
          "type": "api_call",
          "method": "POST",
          "endpoint": "/api/register",
          "body": "{{form}}"
        },
        {
          "type": "store_local",
          "key": "user_token",
          "value": "{{response.token}}"
        },
        {
          "type": "update_state",
          "field": "user",
          "value": "{{response.user}}"
        },
        {
          "type": "analytics",
          "event": "user_registered"
        },
        {
          "type": "reset",
          "target": "Home"
        }
      ]
    }
  }
}
```

### Conditional Actions

```json
{
  "type": "Button",
  "props": {
    "text": "Login / Register"
  },
  "actions": {
    "onPress": {
      "type": "conditional",
      "conditions": [
        {
          "if": {
            "operator": "not_empty",
            "field": "form.email"
          },
          "then": {
            "type": "api_call",
            "endpoint": "/api/check-user",
            "onSuccess": {
              "type": "conditional",
              "conditions": [
                {
                  "if": {
                    "operator": "equals",
                    "field": "response.exists",
                    "value": true
                  },
                  "then": {
                    "type": "navigate",
                    "target": "Login"
                  }
                },
                {
                  "else": {
                    "type": "navigate",
                    "target": "Register"
                  }
                }
              ]
            }
          }
        },
        {
          "else": {
            "type": "alert",
            "message": "Please enter your email first"
          }
        }
      ]
    }
  }
}
```

### Debounced Actions

```json
{
  "type": "TextInput",
  "props": {
    "placeholder": "Search..."
  },
  "actions": {
    "onChangeText": {
      "type": "debounced",
      "delay": 300,
      "action": {
        "type": "api_call",
        "method": "GET",
        "endpoint": "/api/search",
        "params": {
          "query": "{{event.text}}"
        },
        "onSuccess": {
          "type": "update_state",
          "field": "search.results",
          "value": "{{response.results}}"
        }
      }
    }
  }
}
```

## 🛣️ Navigation Setup

### App Navigation Configuration

**File:** `templates/App.template.json`

```json
{
  "navigation": {
    "initialRoute": "LanguageSelection",
    "routes": [
      {
        "name": "LanguageSelection",
        "component": "ChooseLanguage",
        "options": {
          "headerShown": false,
          "gestureEnabled": false
        }
      },
      {
        "name": "Auth",
        "component": "Auth",
        "options": {
          "title": "Sign In",
          "headerShown": true,
          "headerBackVisible": false,
          "headerLeft": null
        }
      },
      {
        "name": "Home",
        "component": "Home",
        "options": {
          "title": "Home",
          "headerShown": true,
          "headerBackVisible": false,
          "headerLeft": null,
          "tabBarIcon": "home"
        }
      },
      {
        "name": "Profile",
        "component": "Profile",
        "options": {
          "title": "Profile",
          "headerShown": true,
          "headerBackVisible": true,
          "presentation": "modal"
        }
      },
      {
        "name": "JobDetails",
        "component": "JobDetails",
        "options": {
          "title": "Job Details",
          "headerShown": true,
          "headerBackVisible": true,
          "headerRight": {
            "type": "Button",
            "props": { "text": "Share" },
            "actions": {
              "onPress": {
                "type": "share",
                "title": "Check out this job",
                "url": "{{job.url}}"
              }
            }
          }
        }
      }
    ],
    "tabNavigation": {
      "enabled": true,
      "tabs": [
        {
          "name": "Home",
          "icon": "home",
          "badge": "{{notifications.count}}"
        },
        {
          "name": "Search",
          "icon": "search"
        },
        {
          "name": "Profile",
          "icon": "user"
        }
      ]
    }
  }
}
```

### Deep Linking

```json
{
  "navigation": {
    "deepLinks": {
      "/job/:jobId": {
        "screen": "JobDetails",
        "params": {
          "jobId": "{{params.jobId}}"
        }
      },
      "/profile/:userId": {
        "screen": "Profile",
        "params": {
          "userId": "{{params.userId}}"
        }
      }
    }
  }
}
```

## 📋 Action Reference

### Navigation Actions

| Action Type | Description                 | Parameters          |
| ----------- | --------------------------- | ------------------- |
| `navigate`  | Go to new screen            | `target`, `params`  |
| `replace`   | Replace current screen      | `target`, `params`  |
| `reset`     | Reset navigation stack      | `target`            |
| `goBack`    | Go to previous screen       | `target` (optional) |
| `popToTop`  | Go to first screen in stack | None                |

### API Actions

| Action Type     | Description               | Parameters                                        |
| --------------- | ------------------------- | ------------------------------------------------- |
| `api_call`      | Make HTTP request         | `method`, `endpoint`, `headers`, `body`, `params` |
| `upload_file`   | Upload file to server     | `endpoint`, `files`, `fields`                     |
| `download_file` | Download file from server | `url`, `filename`                                 |

### State Actions

| Action Type              | Description                  | Parameters       |
| ------------------------ | ---------------------------- | ---------------- |
| `update_state`           | Update app state             | `field`, `value` |
| `update_multiple_states` | Update multiple state fields | `updates`        |
| `store_local`            | Save to local storage        | `key`, `value`   |
| `load_local`             | Load from local storage      | `key`, `field`   |

### UI Actions

| Action Type | Description               | Parameters                    |
| ----------- | ------------------------- | ----------------------------- |
| `alert`     | Show alert dialog         | `title`, `message`, `buttons` |
| `toast`     | Show toast notification   | `message`, `duration`, `type` |
| `loading`   | Show/hide loading spinner | `show`, `message`             |
| `modal`     | Show modal dialog         | `component`, `props`          |

### Device Actions

| Action Type    | Description          | Parameters                |
| -------------- | -------------------- | ------------------------- |
| `camera`       | Open camera          | `options`                 |
| `image_picker` | Open photo picker    | `options`                 |
| `phone_call`   | Make phone call      | `number`                  |
| `sms`          | Send SMS             | `number`, `message`       |
| `email`        | Open email app       | `to`, `subject`, `body`   |
| `get_location` | Get current location | `accuracy`, `timeout`     |
| `share`        | Share content        | `title`, `message`, `url` |

## 🧪 Testing Actions

### Test Navigation

```bash
# Test navigation endpoint
curl -X POST http://localhost:5001/api/config/test-action \
  -H "Content-Type: application/json" \
  -d '{
    "action": {
      "type": "navigate",
      "target": "Profile"
    }
  }'
```

### Test API Actions

```bash
# Test API call action
curl -X POST http://localhost:5001/api/config/test-action \
  -H "Content-Type: application/json" \
  -d '{
    "action": {
      "type": "api_call",
      "method": "GET",
      "endpoint": "/api/user/profile"
    }
  }'
```

## 🚨 Common Action Issues

### Issue 1: Action Not Triggering

```json
// ❌ Wrong event name
{
  "actions": {
    "onClick": {  // Should be "onPress" for buttons
      "type": "navigate"
    }
  }
}

// ✅ Correct event name
{
  "actions": {
    "onPress": {
      "type": "navigate",
      "target": "Home"
    }
  }
}
```

### Issue 2: Navigation Target Not Found

```json
// ❌ Screen name doesn't exist
{
  "type": "navigate",
  "target": "NonExistentScreen"
}

// ✅ Valid screen name from ScreenNames.ts
{
  "type": "navigate",
  "target": "Profile"
}
```

### Issue 3: Missing Required Parameters

```json
// ❌ Missing required parameters
{
  "type": "api_call",
  "endpoint": "/api/update"
  // Missing method
}

// ✅ All required parameters
{
  "type": "api_call",
  "method": "POST",
  "endpoint": "/api/update",
  "body": {...}
}
```

---

## 🎉 You're Now an Actions Expert!

With this comprehensive actions guide, you can:

- 🗺️ **Navigate between screens** smoothly
- 📡 **Communicate with APIs** effectively
- 💾 **Manage app state** dynamically
- 🔔 **Provide user feedback** appropriately
- 📱 **Use device features** seamlessly
- 🎛️ **Handle complex interactions** reliably

_Next: [Real-time Updates Guide](./11-realtime-updates.md)_
