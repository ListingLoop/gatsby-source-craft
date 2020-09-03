<p align="center">
  <img src="craftcms-gatsby.svg" width="278" height="100" alt="Craft CMS + Gatsby">
</p>
<h1 align="center">Gatsby source plugin for Craft CMS</h1>

This Gatsby source plugin provides an integration with [Craft CMS](https://craftcms.com). It uses Craft’s [GraphQL API](https://docs.craftcms.com/v3/graphql.html) to make content within Craft available to Gatsby-powered front ends.

It requires for the corresponding [Gatsby Craft plugin](https://github.com/craftcms/craft-gatsby) to be installed on the Craft site.

# Usage:
Make sure that the following environment variables are defined:

```title:.env
CRAFTGQL_TOKEN=YOUR_TOKEN
CRAFTGQL_URL=https://craftcms-endpoint
```

# Configuration options

- `concurrency`: The number of concurrent connections to use when querying the Craft installation.
