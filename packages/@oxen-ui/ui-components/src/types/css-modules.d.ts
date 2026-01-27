/**
 * @file CSS Modules type definitions
 *
 * Enables TypeScript to understand CSS Module imports.
 */

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
