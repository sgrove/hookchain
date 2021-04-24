var express = require("express");
var app = express();
const { fetch } = require("fetch-ponyfill")({});
// "ExecuteChainMutation_httpRouteTest"
const callChain = async (appId, operationName, params) => {
  console.log("IncomingHttpRequest payload:");
  console.log(JSON.stringify(params, null, 2));
  const response = await fetch(
    `https://serve.onegraph.com/graphql?app_id=${appId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doc_id: params.chainId,
        operationName: operationName,
        variables: params,
      }),
    }
  );

  return response.json();
};

const forwardResonse = async ({ forward }) => {
  console.log("Forwarding: ");
  console.log({
    uri: forward.uri,
    method: forward.method,
    headers: forward.headers,
    body: forward.body,
  });
  const response = await fetch(forward.uri, {
    method: forward.method,
    headers: forward.headers,
    body: forward.body,
  });

  return response.text();
};

app.get("/app/:appId/chain/:chainId/:operationName", async function (req, res) {
  const { appId, chainId, operationName } = req.params;
  let incomingHeaders = { ...req.headers };
  console.log("Params: ", req.params);
  delete incomingHeaders.cookie;
  let body = req.body || "";
  let jsonBody = JSON.parse(req.body || "null");
  let metadata = {};
  const params = {
    chainId: chainId,
    headers: incomingHeaders,
    path: req.path,
    query: req.query,
    body: body,
    jsonBody: jsonBody,
    method: req.method,
    metadata: metadata,
  };

  const result = await callChain(appId, operationName, params);

  const results = result?.data?.oneGraph?.executeChain?.results;

  console.log(result);

  console.log("Plucked results: ", result);

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

  const forward = response?.forward;
  console.log("response: ", response);

  console.log("Forward: ", forward);

  delete response.__onegraph_forward;

  if (!!forward) {
    const forwardResponse = await forwardResonse(response);
    console.log("Forwarded response: ", forward);
    console.log(forwardResonse);
  }

  res
    .status(response?.status || 500)
    .set(headers)
    .send(response?.body || "");
});

const port = process.env.PORT || 9000;

app.listen(port, () => console.log(`Server running on ${port}`));
