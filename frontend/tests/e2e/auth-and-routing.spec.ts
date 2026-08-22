import { expect, test } from '@playwright/test'
import { adminEmail, adminPassword, login, salespersonEmail } from './helpers'

test.describe('authentication and authorization', () => {
  test('rejects invalid credentials without exposing a session', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('Email').fill(adminEmail)
    await page.getByPlaceholder('Password').fill('definitely-wrong-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('logs in, survives a reload through refresh, and logs out', async ({ page }) => {
    await login(page)
    await page.reload()
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByText('DriveFlow', { exact: true }).first()).toBeVisible()

    await page.getByRole('button', { name: /Dealership Administrator/ }).click()
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('enforces role permissions in navigation and direct routes', async ({ page }) => {
    await login(page, salespersonEmail, adminPassword)
    await expect(page.getByRole('link', { name: /Users$/ })).toHaveCount(0)
    await page.goto('/users')
    await expect(page.getByText('You do not have permission to view this page.')).toBeVisible()
  })
})
