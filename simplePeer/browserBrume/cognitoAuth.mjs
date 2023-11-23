import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider"; // ES Modules import
export {refreshTokenAuth};

const refreshTokenAuth = async (ClientId, REFRESH_TOKEN) => {
	const client = new CognitoIdentityProviderClient({region: 'us-east-1'});
	const input = { 
		ClientId,
		AuthFlow: "REFRESH_TOKEN_AUTH",
		AuthParameters: {REFRESH_TOKEN}
	};

	try {
		const command = new InitiateAuthCommand(input);
		return await client.send(command);
	} catch(e){
		throw(e);
	}
};
