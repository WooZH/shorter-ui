const RPC_URL = "https://mainnet-rpc.shorter.finance/";

export async function onRequestPost(context) {
  try {
    let urlParams = context.request.url.split("?");
    let rpcUrl = `${RPC_URL}?${urlParams[1]}`;
    let response = await fetch(rpcUrl, {
      headers: context.request.headers,
      method: "POST",
      body: context.request.body,
    });
    const data = await response.json();
    const result = JSON.stringify(data, null, 2);
    return new Response(result, {
      headers: {
        "content-type": "application/json;charset=UTF-8",
      },
    });
  } catch (err) {
    return new Response(`Error parsing JSON content, ${err.message}`, { status: 400 });
  }
}
