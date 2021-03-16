# Release Notes

## Unreleased
- Fixed a bug where it wasn’t possible to query the `localFile` field on assets that contained non-ASCII characters in the URL. ([#25](https://github.com/craftcms/gatsby-source-craft/issues/25))

## 1.0.0-beta.3 - 2021-01-27
- Craft’s GraphQL API settings can now also be configured from the [Gatsby Helper](https://plugins.craftcms.com/gatsby-helper) plugin settings.
- Fixed a couple errors that could occur when building the Gatsby site. ([#18](https://github.com/craftcms/gatsby-source-craft/issues/18), [#19](https://github.com/craftcms/gatsby-source-craft/issues/19))
- Fixed a bug where some fields that couldn’t be resolved automatically were getting included in Gatsby’s GraphQL schema.

## 1.0.0-beta.2 - 2020-11-26
- Assets now have a `localFile` field, which can be used to generate transforms with `gatsby-transform-sharp`.

## 1.0.0-beta.1.1 - 2020-11-03
- Cleanup.

## 1.0.0-beta.1 - 2020-11-03
- Initial release
