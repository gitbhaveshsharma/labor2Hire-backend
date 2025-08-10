# 📁 File Structure - Complete Organization Guide

Understanding the complete file organization and where to make changes for different tasks.

## 🌳 Complete Directory Tree

```
labor2Hire-backend/
├── labor2Hire-Backend/                    # Backend Server
│   ├── src/
│   │   ├── modules/
│   │   │   └── remote-config/             # 🎯 MAIN CONFIG MODULE
│   │   │       ├── doc/                   # 📚 Documentation
│   │   │       │   ├── README.md
│   │   │       │   ├── 01-quick-start.md
│   │   │       │   ├── 07-creating-screens.md
│   │   │       │   ├── 08-adding-components.md
│   │   │       │   ├── 15-common-workflows.md
│   │   │       │   ├── 16-troubleshooting.md
│   │   │       │   └── 18-file-structure.md (this file)
│   │   │       ├── templates/             # 🎨 UI TEMPLATES
│   │   │       │   ├── Auth.template.json          # Login screen
│   │   │       │   ├── Home.template.json          # Home screen
│   │   │       │   ├── Profile.template.json       # Profile screen
│   │   │       │   ├── App.template.json           # App root config
│   │   │       │   └── ChooseLanguage.template.json # Language selection
│   │   │       ├── schemas/               # 🔒 VALIDATION SCHEMAS
│   │   │       │   ├── Auth.schema.json
│   │   │       │   ├── Home.schema.json
│   │   │       │   ├── Profile.schema.json
│   │   │       │   ├── App.schema.json
│   │   │       │   └── Choose.language.schema.json
│   │   │       ├── configs/               # 🗂️ GENERATED CONFIGS
│   │   │       │   └── (auto-generated from templates)
│   │   │       ├── services/              # 🛠️ CORE SERVICES
│   │   │       │   ├── advancedServices.js
│   │   │       │   ├── auditService.js
│   │   │       │   ├── healthService.js
│   │   │       │   └── metricsService.js
│   │   │       ├── middleware/            # 🔐 MIDDLEWARE
│   │   │       │   └── configAuth.js
│   │   │       ├── tests/                 # 🧪 TESTS
│   │   │       │   ├── remote-config.test.js
│   │   │       │   └── package.json
│   │   │       ├── configManager.js       # 📋 CONFIG MANAGEMENT
│   │   │       ├── websocketServer.js     # 🔌 WEBSOCKET SERVER
│   │   │       ├── routes.js              # 🛣️ API ROUTES
│   │   │       ├── index.js               # 📦 MODULE EXPORTS
│   │   │       └── client-example.js      # 📝 USAGE EXAMPLES
│   │   ├── config/                        # ⚙️ SERVER CONFIG
│   │   │   ├── database.js
│   │   │   ├── logger.js
│   │   │   └── redis.js
│   │   └── app.js                         # 🚀 MAIN SERVER FILE
│   ├── package.json
│   ├── nodemon.json
│   └── logs/
└── Labor2Hire/                           # Frontend App
    ├── src/
    │   ├── components/                    # 🧩 REACT COMPONENTS
    │   │   ├── DynamicScreenRenderer.tsx
    │   │   ├── MainApp.tsx
    │   │   └── common/
    │   │       ├── DynamicRenderer.tsx    # 🎭 MAIN RENDERER
    │   │       └── LoadingComponent.tsx
    │   ├── constants/                     # 📋 CONSTANTS
    │   │   └── ScreenNames.ts             # 🏷️ SCREEN NAMES
    │   ├── features/                      # 🎛️ REDUX FEATURES
    │   │   ├── remoteConfig/
    │   │   │   └── remoteConfigSlice.ts   # 🗂️ CONFIG STATE
    │   │   └── language/
    │   │       ├── LanguageSelectionScreen.tsx
    │   │       └── languageSlice.ts
    │   ├── services/                      # 🔌 SERVICES
    │   │   └── ConfigClient.ts            # 🌐 CONFIG CLIENT
    │   ├── store/                         # 🗃️ REDUX STORE
    │   │   └── index.ts
    │   └── utils/                         # 🛠️ UTILITIES
    │       └── PerformanceUtils.ts
    ├── App.tsx
    ├── package.json
    └── node_modules/
```

## 🎯 Files by Purpose

### 📱 When You Want to Change UI (Frontend)

| What You Want to Change | Files to Modify                      | Example                                |
| ----------------------- | ------------------------------------ | -------------------------------------- |
| **Button text**         | `templates/ScreenName.template.json` | Change "Login" to "Sign In"            |
| **Colors/styling**      | `templates/ScreenName.template.json` | Change button color from blue to green |
| **Add new component**   | `templates/ScreenName.template.json` | Add a new button or text field         |
| **Screen layout**       | `templates/ScreenName.template.json` | Rearrange components, change spacing   |
| **Navigation flow**     | `templates/App.template.json`        | Change which screen appears first      |

### 🆕 When You Want to Create New Screens

| Step                      | File to Create/Modify                     | Purpose                      |
| ------------------------- | ----------------------------------------- | ---------------------------- |
| 1. **Define screen name** | `Labor2Hire/src/constants/ScreenNames.ts` | Add screen identifier        |
| 2. **Create validation**  | `schemas/NewScreen.schema.json`           | Define validation rules      |
| 3. **Create template**    | `templates/NewScreen.template.json`       | Define screen structure      |
| 4. **Add navigation**     | `templates/App.template.json`             | Add route to screen          |
| 5. **Register screen**    | `configManager.js`                        | Tell system about new screen |

### 🛠️ When You Want to Change Backend Logic

| What You Want to Change | Files to Modify            | Example                            |
| ----------------------- | -------------------------- | ---------------------------------- |
| **API endpoints**       | `routes.js`                | Add new config endpoint            |
| **Validation rules**    | `schemas/*.schema.json`    | Add required fields                |
| **WebSocket events**    | `websocketServer.js`       | Add new event types                |
| **Config processing**   | `configManager.js`         | Change how templates are processed |
| **Authentication**      | `middleware/configAuth.js` | Add new auth methods               |

### 🔌 When You Want to Change Frontend Logic

| What You Want to Change  | Files to Modify                              | Example                     |
| ------------------------ | -------------------------------------------- | --------------------------- |
| **Component rendering**  | `components/common/DynamicRenderer.tsx`      | Add new component types     |
| **State management**     | `features/remoteConfig/remoteConfigSlice.ts` | Change how config is stored |
| **WebSocket connection** | `services/ConfigClient.ts`                   | Change connection settings  |
| **Navigation logic**     | `components/DynamicScreenRenderer.tsx`       | Add new action types        |
| **Screen constants**     | `constants/ScreenNames.ts`                   | Add new screen names        |

## 🎨 Template Files Deep Dive

### Template File Structure

```json
{
  "screenType": "ScreenName",           // Must match filename
  "metadata": {                         // Screen information
    "screenTitle": "Display Title",
    "description": "Screen description",
    "version": "1.0.0",
    "lastUpdated": "2025-08-10T00:00:00Z"
  },
  "globalStyles": {                     // Screen-wide styles
    "backgroundColor": "#f8f9fa",
    "statusBar": {
      "barStyle": "dark-content"
    }
  },
  "components": [                       // UI component tree
    {
      "type": "SafeAreaView",
      "style": { "flex": 1 },
      "children": [...]
    }
  ],
  "loadingState": {                     // Loading screen
    "type": "ActivityIndicator",
    "props": { "size": "large" }
  },
  "errorState": {                       // Error screen
    "type": "Text",
    "props": { "text": "Error loading screen" }
  }
}
```

### Available Template Files

```
templates/
├── App.template.json              # 🏠 Main app configuration
│   ├── navigation setup
│   ├── global styles
│   ├── providers configuration
│   └── app-level features
├── Auth.template.json             # 🔐 Authentication screen
│   ├── login form
│   ├── social login options
│   └── registration links
├── ChooseLanguage.template.json   # 🌐 Language selection
│   ├── language options
│   ├── flag images
│   └── selection logic
├── Home.template.json             # 🏠 Home dashboard
│   ├── user welcome
│   ├── quick actions
│   └── recent activity
└── Profile.template.json          # 👤 User profile
    ├── user information
    ├── settings options
    └── logout functionality
```

## 🔒 Schema Files Deep Dive

### Schema File Purpose

- **Validation**: Ensure configurations are valid
- **Type Safety**: Define allowed property types
- **Documentation**: Self-documenting configuration structure
- **Error Prevention**: Catch issues before deployment

### Schema File Structure

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Screen Configuration Schema",
  "type": "object",
  "required": ["screenType", "metadata", "components"],
  "properties": {
    "screenType": {
      "type": "string",
      "enum": ["SpecificScreenName"]
    },
    "metadata": {
      "type": "object",
      "required": ["screenTitle", "description"],
      "properties": {
        "screenTitle": { "type": "string" },
        "description": { "type": "string" }
      }
    },
    "components": {
      "type": "array",
      "items": { "$ref": "#/definitions/Component" }
    }
  },
  "definitions": {
    "Component": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": { "type": "string" },
        "props": { "type": "object" },
        "style": { "type": "object" },
        "children": {
          "type": "array",
          "items": { "$ref": "#/definitions/Component" }
        }
      }
    }
  }
}
```

## 🛠️ Backend Service Files

### Core Service Files

```
services/
├── advancedServices.js         # 🎛️ Advanced features
│   ├── Template engine
│   ├── Version management
│   └── Backup service
├── auditService.js            # 📊 Audit logging
│   ├── Change tracking
│   ├── User activity logs
│   └── Security events
├── healthService.js           # 🏥 Health monitoring
│   ├── System health checks
│   ├── Performance monitoring
│   └── Alert management
└── metricsService.js          # 📈 Performance metrics
    ├── Request metrics
    ├── Response times
    └── Error tracking
```

### Main Backend Files

```
remote-config/
├── configManager.js           # 🎛️ Configuration management
│   ├── File loading/watching
│   ├── Template processing
│   ├── Cache management
│   └── Validation orchestration
├── websocketServer.js         # 🔌 Real-time updates
│   ├── Client connection handling
│   ├── Broadcast management
│   ├── Event processing
│   └── Connection statistics
├── routes.js                  # 🛣️ HTTP API endpoints
│   ├── GET /api/config/all
│   ├── GET /api/config/screen/:name
│   ├── POST /api/config/update
│   └── POST /api/config/reload
└── index.js                   # 📦 Module initialization
    ├── Service coordination
    ├── Dependency injection
    └── Export management
```

## 🧩 Frontend Component Files

### React Native Components

```
components/
├── common/
│   ├── DynamicRenderer.tsx    # 🎭 Main component renderer
│   │   ├── Component type mapping
│   │   ├── Props processing
│   │   ├── Style application
│   │   ├── Action handling
│   │   └── Error boundaries
│   └── LoadingComponent.tsx   # ⏳ Loading states
│       ├── Configurable spinner
│       ├── Loading messages
│       └── Timeout handling
├── DynamicScreenRenderer.tsx  # 📱 Screen-level renderer
│   ├── Screen configuration loading
│   ├── Navigation integration
│   ├── State management
│   └── Error handling
└── MainApp.tsx               # 🏠 Main app component
    ├── Configuration initialization
    ├── WebSocket connection
    ├── Route management
    └── Global state
```

### State Management Files

```
features/
├── remoteConfig/
│   └── remoteConfigSlice.ts   # 🗂️ Configuration state
│       ├── Config storage
│       ├── Loading states
│       ├── Error handling
│       ├── WebSocket integration
│       └── Async actions
└── language/
    ├── LanguageSelectionScreen.tsx  # 🌐 Language screen
    └── languageSlice.ts            # 🌍 Language state
```

## 📋 Configuration Files

### Server Configuration

```
config/
├── database.js               # 🗄️ Database connection
├── logger.js                 # 📝 Logging configuration
└── redis.js                  # 🔴 Redis connection
```

### App Configuration

```
Labor2Hire/
├── package.json              # 📦 Dependencies
├── tsconfig.json             # 📘 TypeScript config
├── metro.config.js           # 🚇 Metro bundler
└── babel.config.js           # 🗼 Babel transpiler
```

## 🎯 Quick File Finder

### "I want to change..."

| Change                 | Go to this file                                                              |
| ---------------------- | ---------------------------------------------------------------------------- |
| **Login screen text**  | `templates/Auth.template.json`                                               |
| **Home screen layout** | `templates/Home.template.json`                                               |
| **App colors/theme**   | `templates/App.template.json` → `globalStyles`                               |
| **Navigation routes**  | `templates/App.template.json` → `navigation`                                 |
| **Button actions**     | `templates/ScreenName.template.json` → find button → `actions`               |
| **Add new screen**     | Create `templates/NewScreen.template.json` + `schemas/NewScreen.schema.json` |
| **Validation rules**   | `schemas/ScreenName.schema.json`                                             |
| **API endpoints**      | `routes.js`                                                                  |
| **WebSocket events**   | `websocketServer.js`                                                         |
| **Component types**    | `components/common/DynamicRenderer.tsx`                                      |
| **Screen names**       | `constants/ScreenNames.ts`                                                   |
| **State management**   | `features/remoteConfig/remoteConfigSlice.ts`                                 |

### "I'm getting an error in..."

| Error Location           | Check these files                                         |
| ------------------------ | --------------------------------------------------------- |
| **Template loading**     | `configManager.js`, template file syntax                  |
| **Schema validation**    | `schemas/ScreenName.schema.json`                          |
| **Component rendering**  | `components/common/DynamicRenderer.tsx`                   |
| **WebSocket connection** | `services/ConfigClient.ts`, `websocketServer.js`          |
| **Navigation**           | `templates/App.template.json`, `constants/ScreenNames.ts` |
| **API calls**            | `routes.js`, server logs                                  |
| **State updates**        | `features/remoteConfig/remoteConfigSlice.ts`              |

## 📂 File Naming Conventions

### Templates

- **Format**: `ScreenName.template.json`
- **Examples**: `Auth.template.json`, `Profile.template.json`
- **Rule**: Must match schema filename and screen type

### Schemas

- **Format**: `ScreenName.schema.json`
- **Examples**: `Auth.schema.json`, `Profile.schema.json`
- **Rule**: Must match template filename

### Components

- **Format**: `ComponentName.tsx`
- **Examples**: `DynamicRenderer.tsx`, `MainApp.tsx`
- **Rule**: PascalCase for React components

### Services

- **Format**: `serviceName.js`
- **Examples**: `configManager.js`, `auditService.js`
- **Rule**: camelCase for service files

## 🔄 File Change Impact

### Template File Changes

**Impact**: 🟢 Low risk - Changes appear immediately
**Affects**: Frontend UI only
**Rollback**: Easy - revert file changes

### Schema File Changes

**Impact**: 🟡 Medium risk - Can break validation
**Affects**: Configuration validation
**Rollback**: Medium - may need to fix templates

### Backend Service Changes

**Impact**: 🔴 High risk - Requires server restart
**Affects**: API, WebSocket, validation
**Rollback**: Complex - may need code deployment

### Frontend Component Changes

**Impact**: 🔴 High risk - Requires app rebuild
**Affects**: Component rendering, actions
**Rollback**: Complex - may need app deployment

## 🎯 Best Practices for File Organization

### ✅ Do's

- Keep templates simple and focused
- Use descriptive schema property names
- Group related components together
- Follow naming conventions consistently
- Comment complex configurations
- Version control all changes
- Backup working configurations

### ❌ Don'ts

- Don't mix screen types in one template
- Don't skip schema validation
- Don't hardcode values in templates
- Don't create circular dependencies
- Don't ignore file naming conventions
- Don't modify generated config files
- Don't forget to test changes

---

## 🎉 You Now Know the File Structure!

Understanding this file organization will help you:

- 🎯 **Find files quickly** when making changes
- 🛠️ **Know what to modify** for different tasks
- 🧪 **Test changes** in the right places
- 🔄 **Understand dependencies** between files
- 🚀 **Work efficiently** with the system

_Next: [Configuration Reference](./19-configuration-reference.md)_
