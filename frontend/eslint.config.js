import js from '@eslint/js'
import react from 'eslint-plugin-react'
import hooks from 'eslint-plugin-react-hooks'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } }
    },
    plugins: { react, hooks },
    rules: {
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off'
    }
  }
]
