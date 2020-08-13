
import {GraphQLSchema} from "graphql";
import {GraphQLAbstractType, GraphQLObjectType} from "graphql/type/definition";
import {ISourcingConfig, IGatsbyNodeDefinition, IGatsbyNodeConfig} from "gatsby-graphql-source-toolkit/dist/types";
import {NodePluginArgs} from "gatsby";

type SourcePluginOptions = {
    token: string;
    endpoint: string;
}

/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/node-apis/
 */
const fs = require("fs-extra")
const fetch = require("node-fetch")
const path = require("path")
const {print} = require("gatsby/graphql")
const {
    sourceAllNodes,
    sourceNodeChanges,
    createSchemaCustomization,
    generateDefaultFragments,
    compileNodeQueries,
    buildNodeDefinitions,
    wrapQueryExecutorWithQueue,
    loadSchema,
} = require("gatsby-graphql-source-toolkit")

const fragmentsDir = __dirname + "/src/craft-fragments";
const debugDir = __dirname + "/.cache/craft-graphql-documents";
const gatsbyTypePrefix = `Craft_`;

let craftGqlToken: string;
let craftGqlUrl: string;
let schema: GraphQLSchema;
let gatsbyNodeTypes: IGatsbyNodeConfig[];
let sourcingConfig: ISourcingConfig & {verbose: boolean};

// 1. Gatsby field aliases
// 2. Node ID transforms?
// 3. Pagination strategies?
// 4. Schema customization field transforms?
// 5. Query variable provider?

async function getSchema() {
    if (!schema) {
        schema = await loadSchema(execute)
    }
    return schema
}

async function getGatsbyNodeTypes() {
    if (gatsbyNodeTypes) {
        return gatsbyNodeTypes
    }
    const schema = await getSchema()
    const fromIface = (ifaceName: string, doc: (type: string) => string): IGatsbyNodeConfig[] => {
        const iface = schema.getType(ifaceName) as GraphQLAbstractType;
        return schema.getPossibleTypes(iface).map(type => ({
            remoteTypeName: type.name,
            remoteIdFields: [`__typename`, `id`],
            queries: doc(type.name),
        }))
    }

    // prettier-ignore

    return (gatsbyNodeTypes = [
        ...fromIface(`EntryInterface`, type => `
      query LIST_${type} { entries(type: "${type.split(`_`)[0]}", limit: $limit, offset: $offset) }
      query NODE_${type} { entry(type: "${type.split(`_`)[0]}", id: $id) }
    `),
        ...fromIface(`AssetInterface`, type => `
      query LIST_${type} { assets(limit: $limit, offset: $offset) }
    `),
        ...fromIface(`UserInterface`, type => `
      query LIST_${type} { users(limit: $limit, offset: $offset) }
    `),
        ...fromIface(`TagInterface`, type => `
      query LIST_${type} { tags(limit: $limit, offset: $offset) }
    `),
        ...fromIface(`GlobalSetInterface`, type => `
      query LIST_${type} { globalSets(limit: $limit, offset: $offset) }
    `),
    ])
}

async function writeDefaultFragments() {
    const defaultFragments = generateDefaultFragments({
        schema: await getSchema(),
        gatsbyNodeTypes: await getGatsbyNodeTypes(),
    })
    for (const [remoteTypeName, fragment] of defaultFragments) {
        const filePath = path.join(fragmentsDir, `${remoteTypeName}.graphql`)
        if (!fs.existsSync(filePath)) {
            await fs.writeFile(filePath, fragment)
        }
    }
}

async function collectFragments() {
    const customFragments = []
    for (const fileName of await fs.readdir(fragmentsDir)) {
        if (/.graphql$/.test(fileName)) {
            const filePath = path.join(fragmentsDir, fileName)
            const fragment = await fs.readFile(filePath)
            customFragments.push(fragment.toString())
        }
    }
    return customFragments
}

async function writeCompiledQueries(nodeDocs: IGatsbyNodeDefinition[]) {
    await fs.ensureDir(debugDir)
    // @ts-ignore
    for (const [remoteTypeName, document] of nodeDocs) {
        await fs.writeFile(debugDir + `/${remoteTypeName}.graphql`, print(document))
    }
}

async function getSourcingConfig(gatsbyApi: NodePluginArgs, pluginOptions: SourcePluginOptions) {
    if (sourcingConfig) {
        return sourcingConfig
    }
    const schema = await getSchema()
    const gatsbyNodeTypes = await getGatsbyNodeTypes()

    const documents = await compileNodeQueries({
        schema,
        gatsbyNodeTypes,
        customFragments: await collectFragments(),
    })

    await writeCompiledQueries(documents)

    return (sourcingConfig = {
        gatsbyApi,
        schema,
        gatsbyNodeDefs: buildNodeDefinitions({gatsbyNodeTypes, documents}),
        gatsbyTypePrefix,
        execute: wrapQueryExecutorWithQueue(execute, {concurrency: 10}),
        verbose: true,
    })
}

async function execute(operation: { operationName: string, query: string, variables: object }) {
    let {operationName, query, variables = {}} = operation;

    // console.log(operationName, variables)
    const res = await fetch(craftGqlUrl, {
        method: "POST",
        body: JSON.stringify({query, variables, operationName}),
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${craftGqlToken}`,
        },
    })
    return await res.json()
}


exports.onPreBootstrap = async (gatsbyApi: NodePluginArgs, pluginOptions: SourcePluginOptions) => {
    craftGqlToken = pluginOptions.token;
    craftGqlUrl = pluginOptions.endpoint;
    await writeDefaultFragments()
}

exports.createSchemaCustomization = async (gatsbyApi: NodePluginArgs, pluginOptions: SourcePluginOptions) => {
    const config = await getSourcingConfig(gatsbyApi, pluginOptions)
    await createSchemaCustomization(config)
}

exports.sourceNodes = async (gatsbyApi: NodePluginArgs, pluginOptions: SourcePluginOptions) => {
    const {cache} = gatsbyApi
    const config = await getSourcingConfig(gatsbyApi, pluginOptions)
    const cached = (await cache.get(`CRAFT_SOURCED`)) || false

    if (cached) {
        // Applying changes since the last sourcing
        const nodeEvents = [
            {
                eventName: "DELETE",
                remoteTypeName: "blog_blog_Entry",
                remoteId: {__typename: "blog_blog_Entry", id: "422"},
            },
            {
                eventName: "UPDATE",
                remoteTypeName: "blog_blog_Entry",
                remoteId: {__typename: "blog_blog_Entry", id: "421"},
            },
            {
                eventName: "UPDATE",
                remoteTypeName: "blog_blog_Entry",
                remoteId: {__typename: "blog_blog_Entry", id: "18267"},
            },
            {
                eventName: "UPDATE",
                remoteTypeName: "blog_blog_Entry",
                remoteId: {__typename: "blog_blog_Entry", id: "11807"},
            },
        ]
        console.log(`Sourcing delta!`)
        await sourceNodeChanges(config, {nodeEvents})
        return
    }

    await sourceAllNodes(config)
    await cache.set(`CRAFT_SOURCED`, true)
}
