Collecting workspace informationFiltering to most relevant information# React + React-Bootstrap Starter Codebase: Comprehensive "How to Use and Customize" Guide

---

## 1. Project Overview & Architecture

### Purpose

This project is a **React + React-Bootstrap starter/boilerplate** designed for scalable, maintainable web applications. It provides a robust foundation with authentication, user management, CRUD operations, localization, and testing, following best practices for modern React development.

### Folder & File Structure

```
contacts/
├── public/                # Static assets
├── src/
│   ├── components/        # Reusable UI components (forms, layout, dialogs, etc.)
│   ├── context/           # Global state/context providers
│   ├── hooks/             # Custom React hooks
│   ├── i18n/              # Localization setup and translation files
│   ├── layouts/           # Layout components (PublicLayout, etc.)
│   ├── pages/             # Route-level pages (login, signup, dashboard, profile, etc.)
│   ├── routes/            # Routing definitions and guards
│   ├── services/          # API service modules
│   ├── utils/             # Utility functions (date, string, token, etc.)
│   ├── validations/       # Form validation rules
│   ├── App.tsx            # Main app entry point
│   ├── main.tsx           # React root rendering
│   └── setup.ts           # Test setup
├── package.json           # Project dependencies and scripts
├── vite.config.ts         # Vite build/test config
├── tsconfig*.json         # TypeScript configs
├── README.md              # Project documentation
└── ...                    # Other config and coverage files
```

#### Key Folders & Files

- **components/**: UI building blocks (forms, modals, layout, alert cards, etc.)
- **context/**: Global state management (e.g., `ContactContext`)
- **hooks/**: Custom hooks (e.g., `useDebounce`)
- **i18n/**: Localization setup, translation files (en.json)
- **layouts/**: Page layouts (header, footer, sidebar)
- **pages/**: Route-level screens (login, signup, profile, dashboard, etc.)
- **routes/**: Routing logic and guards (`ProtectedRoute`, `PublicRoute`)
- **services/**: API calls (auth, user, contact, token)
- **utils/**: Helper functions (date formatting, token handling, etc.)
- **validations/**: Centralized form validation rules
- **tests**: Unit/integration tests (in `__tests__` folders)

### Layer Interactions

- **App.tsx**: Sets up providers, routing, error boundaries.
- **Routes**: Define navigation and access control.
- **Pages**: Use components, context, services, and validations.
- **Components**: Reusable UI, consume context, i18n, and validations.
- **Services**: Centralize API calls, used by pages/components.
- **Context**: Provide global state (auth, user, etc.).
- **Utils**: Shared helpers for formatting, token, etc.
- **Validations**: Used in forms for input validation.
- **i18n**: Localization for UI strings.
- **Tests**: Validate features and integration.

### Major Dependencies

- **React**: UI library.
- **React-Bootstrap**: UI components styled with Bootstrap.
- **React Router**: Routing/navigation.
- **React Hook Form**: Form state and validation.
- **i18next + react-i18next**: Localization.
- **Vitest**: Unit/integration testing.
- **React Testing Library**: Component testing.
- **date-fns**: Date formatting.
- **axios**: HTTP requests.

---

## 2. Detailed File-by-File & Feature-by-Feature Explanation

### App.tsx

**Purpose:**  
Main entry point. Sets up providers (GoogleOAuth, ContactContext), error boundaries, and routing.

**Implementation:**  
```tsx
// src/App.tsx
function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_SSO_CLIENT_ID}>
      <ContactProvider>
        <ErrorBoundary fallback={<ErrorFallback />}>
          <Suspense fallback={<PageLoadingSpinner />}>
            <RouterProvider router={router} />
          </Suspense>
        </ErrorBoundary>
      </ContactProvider>
    </GoogleOAuthProvider>
  );
}
```
**Connections:**  
- Uses `ContactProvider` for global state.
- Uses `RouterProvider` for navigation.
- Uses `ErrorBoundary` for error handling.

**Customization:**  
- Add new providers (e.g., ThemeProvider).
- Change fallback UI for loading/error.

---

### Routing System

**Files:**  
- index.tsx
- ProtectedRoute.tsx
- PublicRoute.tsx

**Purpose:**  
Defines all routes, applies access control (public/protected/admin).

**Implementation:**  
- **ProtectedRoute**: Redirects unauthenticated users, restricts admin-only pages.
- **PublicRoute**: Handles public pages, clears session for signup/forgot-password flows.

**Example:**
````tsx
// src/routes/guards/ProtectedRoute.tsx
if (!token) return <Navigate to={redirectPath} replace />;
if (role === "1" && adminOnlyPaths.includes(location.pathname)) {
  return <Navigate to="/contacts" replace />;
}
````

**Customization:**  
- Add new routes in index.tsx.
- Extend guards for new roles or access rules.

---

### Authentication & User Management

#### Login

**Files:**  
- LoginPage.tsx
- authService.ts

**Purpose:**  
Login form with validation, calls API, updates context.

**Implementation:**  
- Uses React Hook Form for state/validation.
- Calls `login()` from `authService`.
- Updates context with token/user.

**Customization:**  
- Add fields (e.g., 2FA).
- Change validation rules in formValidations.ts.
- Update API endpoint in `authService.ts`.

#### Signup with Email Verification

**Files:**  
- SignUpPage.tsx
- SignUpTokenPage.tsx

**Purpose:**  
Signup flow with email verification.

**Implementation:**  
- Form validation.
- Calls `verifyEmail()` and `userRegistration()` from `authService`.
- Handles token verification via URL.

**Customization:**  
- Add custom fields.
- Change verification logic.

#### Forgot Password & Reset Password

**Files:**  
- ForgotPasswordPage.tsx
- UserPasswordReset.tsx

**Purpose:**  
Forgot password flow, email verification, reset password form.

**Implementation:**  
- Form validation.
- Calls `forgotPasswordVerifyEmail()` and `forgotPasswordverifyEmailToken()` from `authService`.
- Handles token validation and password reset.

**Customization:**  
- Change email template.
- Add password strength validation.

---

### Contact List (CRUD)

#### Contact List Page

**Files:**  
- UserManagementListPage.tsx
- contactService.ts

**Purpose:**  
Displays contacts with pagination, search, sorting.

**Implementation:**  
- Fetches contacts via `getAllUsers()`.
- Uses pagination and sorting logic.

**Customization:**  
- Add new filters.
- Change table columns.

#### Add/Edit/View/Delete Contacts

**Files:**  
- AddContact.tsx
- EditContact.tsx
- ViewContact.tsx
- DeleteContact.tsx

**Purpose:**  
CRUD operations for contacts.

**Implementation:**  
- Uses React Hook Form for input.
- Calls API via `contactService`.
- Uses modals/dialogs for UI.

**Customization:**  
- Add new fields to forms.
- Change validation rules.
- Update API endpoints.

---

### Profile Page

**Files:**  
- ProfilePage.tsx

**Purpose:**  
View and update user profile, including image upload.

**Implementation:**  
- Uses form with validation.
- Calls `userProfileUpdate()` from `userService`.
- Handles image upload and preview.

**Customization:**  
- Add new profile fields.
- Change image upload logic.

---

### Localization (i18n)

**Files:**  
- en.json
- index.ts

**Purpose:**  
Multi-language support.

**Implementation:**  
- Uses i18next and react-i18next.
- Translation files per language.

**Customization:**  
- Add new language file (e.g., `ja.json`).
- Update translation keys.

**Example:**
````json
// src/i18n/resources/en.json
{
  "app": {
    "header": "Contacts"
  },
  ...
}
````

---

### Services Layer

**Files:**  
- authService.ts
- contactService.ts
- userService.ts

**Purpose:**  
Centralize API calls.

**Implementation:**  
- Each service exports functions for API endpoints.
- Uses axios for HTTP requests.

**Customization:**  
- Add new API functions.
- Update endpoint URLs.

---

### Context Providers

**Files:**  
- ContactContext.tsx

**Purpose:**  
Global state management (auth, user, countries).

**Implementation:**  
- Uses React Context API.
- Exposes state and setters.

**Customization:**  
- Add new state values.
- Expose new functions.

---

### Forms with React Hook Form

**Files:**  
- ContactForm.tsx
- PasswordChangeForm.tsx
- UserForm.tsx

**Purpose:**  
Reusable, validated forms.

**Implementation:**  
- Uses `useForm` and validation rules.
- Error handling via form state.

**Customization:**  
- Add new fields.
- Change validation logic.

---

### Validation Rules

**Files:**  
- formValidations.ts

**Purpose:**  
Centralized validation for forms.

**Implementation:**  
- Exports validation objects for each field.
- Used in form components.

**Customization:**  
- Add new validation rules.
- Update error messages.

---

### Shared Components

**Files:**  
- Header.tsx
- Sidebar.tsx
- PageLoadingSpinner.tsx
- ErrorCard.tsx

**Purpose:**  
Reusable UI elements.

**Implementation:**  
- Use props for customization.
- Consume context/i18n.

**Customization:**  
- Add new props.
- Change styles.

---

### Utilities

**Files:**  
- dateUtils.ts
- stringUtils.ts
- tokenUtils.ts

**Purpose:**  
Helper functions for formatting, token handling, etc.

**Implementation:**  
- Export pure functions.
- Used across components/services.

**Customization:**  
- Add new utility functions.

---

### Testing Setup

**Files:**  
- EditContact.test.tsx
- vite.config.ts

**Purpose:**  
Unit/integration tests with Vitest + React Testing Library.

**Implementation:**  
- Tests in `__tests__` folders.
- Use mocks for services/context/i18n.

**Customization:**  
- Add new test files.
- Follow existing test patterns.

---

## 3. Customization & Extension Guide

### Updating API Endpoints

- Edit or add functions in `services/` (e.g., `contactService.ts`).
- Update endpoint URLs and request logic.

### Adding New Forms

- Create a new component using React Hook Form.
- Import and apply validation rules from `formValidations.ts`.
- Handle errors via form state.

### Adding New Pages/Routes

- Add new page component in `pages/`.
- Register route in index.tsx.
- Add navigation links in Sidebar/Header.

### Adding Translations

- Add new language file in resources.
- Update keys in components using `t("key")`.

### Extending Context

- Add new state and setter in `ContactContext.tsx`.
- Expose via context value.

### Reusing/Modifying Shared UI Components

- Add props to shared components (e.g., Sidebar, Header).
- Update styles or logic as needed.

---

## 4. Connections Between Files (Cross-References)

- **LoginPage** uses `authService.login()` and updates context via `useMyContext`.
- **SignupPage** calls `authService.signup()` and handles email verification.
- **ForgotPasswordPage** calls `authService.forgotPassword()`.
- **UserPasswordReset** validates token via `authService.forgotPasswordverifyEmailToken()`.
- **ContactListPage** fetches data via `contactService.getAllUsers()`.
- **Validation** for email is defined in `formValidations.ts` and used in forms.
- **ProfilePage** updates profile via `userService.userProfileUpdate()` and uses context.
- **Sidebar/Header** consume context and i18n for user info and translations.

---

## 5. Best Practices & Recommendations

- **Folder Naming:** Use lowercase, hyphenated names (`user-profile`, `admin-user-management`).
- **Hooks:** Place custom hooks in `hooks/`.
- **Styling:** Use React-Bootstrap for consistent UI.
- **Components:** Make components reusable and prop-driven.
- **Forms:** Use React Hook Form for all forms.
- **Validation:** Centralize rules in `validations/`.
- **Testing:** Place tests in `__tests__` folders, mock dependencies.
- **Do’s:**  
  - Keep logic in services/context, not components.
  - Use context for global state.
  - Use i18n for all UI strings.
  - Write tests for new features.
- **Don’ts:**  
  - Don’t hardcode API URLs in components.
  - Don’t duplicate validation logic.
  - Don’t mix UI and business logic.

---

## 6. Formatting & Example Usage

### Example: Adding a New Route

```tsx
// src/routes/index.tsx
{
  path: "new-feature",
  element: <NewFeaturePage />,
}
```

### Example: Using Context

```tsx
const { user, setUser } = useMyContext();
```

### Example: Adding a Validation Rule

```ts
// src/validations/formValidations.ts
export const phoneValidation = {
  required: "errors.phone.required",
  pattern: {
    value: /^[0-9]{10}$/,
    message: "errors.phone.invalid",
  },
};
```

### Example: Consuming Translations

```tsx
const { t } = useTranslation();
return <span>{t("app.header")}</span>;
```

---

## Conclusion

This codebase is a robust, extensible foundation for React projects with modern architecture, best practices, and comprehensive features. Use this guide to understand, customize, and extend every part of the system, ensuring maintainability and scalability for future projects.

---

**References:**
- `App.tsx`
- `ContactContext`
- `authService`
- `contactService`
- `formValidations.ts`
- `routes/index.tsx`
- `i18n/resources/en.json`
- `EditContact.tsx`
- `ProfilePage.tsx`

For further details, explore the referenced files directly in your workspace.