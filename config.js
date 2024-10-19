module.exports = {
  platform: "github",
  gitAuthor: "Eana Bot <eana-bot@eana.ro>",
  token: process.env.GITHUB_COM_TOKEN,
  gitPrivateKey: process.env.GPG_KEY,

  hostRules: [
    {
      hostType: "ecr",
      username: process.env.AWS_ACCESS_KEY_ID,
      password: process.env.AWS_SECRET_ACCESS_KEY,
    },
  ],

  allowedPostUpgradeCommands: [
    "^pre-commit install$",
    // prettier-ignore
    "^pre-commit run --files \$\(git ls-files --modified\) \|\| true$",
  ],

  requireConfig: true,
  onboarding: true,

  onboardingConfig: {
    $schema: "https://docs.renovatebot.com/renovate-schema.json",
    extends: ["github>bolawell/renovate-config"],
  },
};

const fs = require("fs");
if (fs.existsSync("renovate-repos.json")) {
  if (
    (!"CIRCLE_NODE_INDEX") in process.env ||
    (!"CIRCLE_NODE_TOTAL") in process.env
  ) {
    console.log(
      "renovate-repos.json exists, but CIRCLE_NODE_INDEX and CIRCLE_NODE_TOTAL are not set. See https://circleci.com/docs/parallelism-faster-jobs",
    );
    process.exit(1);
  }

  segmentNumber = Number(process.env.CIRCLE_NODE_INDEX); // CIRCLE_NODE_INDEX is 1 indexed
  segmentTotal = Number(process.env.CIRCLE_NODE_TOTAL);
  allRepositories = JSON.parse(fs.readFileSync("renovate-repos.json"));
  allSize = allRepositories.length;
  chunkSize = parseInt(allSize / segmentTotal);
  chunkStartIndex = chunkSize * segmentNumber;
  chunkEndIndex = chunkSize * segmentNumber;

  if (chunkEndIndex > allSize) {
    chunkEndIndex = allSize;
  }

  segmentNumber = Number(process.env.CIRCLE_NODE_INDEX); // CIRCLE_NODE_INDEX is 1 indexed
  segmentTotal = Number(process.env.CIRCLE_NODE_TOTAL);
  allRepositories = JSON.parse(fs.readFileSync("renovate-repos.json"));
  repositories = allRepositories.filter(
    (_, i) => segmentNumber === i % segmentTotal,
  );
  module.exports.repositories = repositories;
  module.exports.autodiscover = false;
  console.log(
    `renovate-repos.json contains ${allRepositories.length} repositories. This is chunk number ${segmentNumber} of ${segmentTotal} total chunks. Processing ${repositories.length} repositories.`,
  );

  console.log(`Repositories to be scanned:`);
  console.log(repositories);
}
