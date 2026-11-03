# Contributing to Zenc SDK (JavaScript / TypeScript)

Thank you for contributing to the **Zenc Client SDK**! This SDK provides browser and Node.js developers with a clean WebRTC API to build real-time interactive audio/video applications on Zenc.

---

## Development Workflow

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** / **pnpm**

### Setup
1. Fork and clone the repository:
   ```bash
   git clone https://github.com/<your-username>/zenc-sdk.git
   cd zenc-sdk
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the build in watch mode for local development:
   ```bash
   npm run dev
   ```

---

## Code Quality & Testing

### Running Tests
We use [Vitest](https://vitest.dev/) for unit and integration testing:
```bash
# Run tests
npm test

# Run tests with coverage report
npm run test:coverage
```

### Type Checking & Linting
Before submitting a Pull Request, ensure there are no TypeScript compiler errors or ESLint warnings:
```bash
# Type check
npm run typecheck

# Linting
npm run lint
```

### Building the Package
Verify that the package builds cleanly with both ESM and CommonJS outputs:
```bash
npm run build
```

---

## Pull Request Guidelines

1. **Branch naming**: `feat/feature-name`, `fix/issue-description`, or `docs/doc-update`.
2. **Conventional Commits**:
   - `feat(room): support reconnecting event with exponential backoff`
   - `fix(webrtc): handle ice restart state properly`
   - `test(participant): add unit tests for track mute state`
3. **Sign-off commits**: Use `git commit -s` for Developer Certificate of Origin (DCO) compliance.
4. By contributing, you agree that your code will be licensed under the **Apache License 2.0**.

