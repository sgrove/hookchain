var express = require("express");
var app = express();
const { fetch } = require("fetch-ponyfill")({});

const callChain = async (params) => {
  const appId = params.appId;
  delete params.appId;
  const response = await fetch(
    `https://serve.onegraph.com/graphql?app_id=${appId}`,
    {
      method: "POST",
      "Content-Type": "application/json",
      body: JSON.stringify({
        doc_id: params.chainId,
        operationName: "ExecuteChainMutation_httpRouteTest",
        variables: params,
      }),
    }
  );

  return response.json();
};

app.get("/app/:appId/chain/:chainId", async function (req, res) {
  const { appId, chainId } = req.params;
  let incomingHeaders = Object.entries(req.headers);
  let body = req.body || "";
  let jsonBody = JSON.parse(req.body || "null");
  let metadata = {};
  const params = {
    appId: appId,
    chainId: chainId,
    headers: incomingHeaders,
    path: req.path,
    query: req.query,
    body: body,
    jsonBody: jsonBody,
    method: req.method,
    metadata: metadata,
  };

  const result = await callChain(params);

  const results = result?.data?.oneGraph?.executeChain?.results;

  console.log(results);

  const argumentDependencies = results
    ?.find((i) => i.request.id === "OutgoingHttpResponse")
    ?.argumentDependencies?.map((argDep) => [
      argDep.name,
      argDep.returnValues?.[0],
    ]);

  const response = Object.fromEntries(argumentDependencies || []);
  console.log(argumentDependencies, response);
  const headers = Object.fromEntries(
    response?.headers ? [response?.headers] : []
  );

  res
    .status(response?.status || 500)
    .set(headers)
    .send(response?.body || "");
});

app.listen(9000, function () {
  console.log("Example app listening on port 9000!");
});
