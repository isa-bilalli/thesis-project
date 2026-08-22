import { expect, type Page } from '@playwright/test'

export const adminEmail = process.env.SEED_TENANT_ADMIN_EMAIL ?? ''
export const adminPassword = process.env.SEED_TENANT_ADMIN_PASSWORD ?? ''
export const salespersonEmail = 'perf.salesperson@demo-motors.test'

export async function login(
  page: Page,
  email = adminEmail,
  password = adminPassword,
): Promise<void> {
  await page.goto('/login')
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('link', { name: /Dashboard$/ })).toBeVisible()
}
