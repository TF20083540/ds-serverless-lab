import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("Event: ", JSON.stringify(event));
    const queryParams = event.queryStringParameters;
    if (!queryParams) {
      return {
        statusCode: 500,
        headers: {
          "content-type": "application/json",
 },
        body: JSON.stringify({ message: "Missing query parameters" }),
 };
 }
    if (!queryParams.movieId) {
      return {
        statusCode: 500,
        headers: {
          "content-type": "application/json",
 },
        body: JSON.stringify({ message: "Missing movie Id parameter" }),
 };
 }

    const movieId = parseInt(queryParams?.movieId);
    let commandInput: QueryCommandInput = {
      TableName: process.env.CAST_TABLE_NAME,
 };
    //I think a new command is due here? Maybe?
    let movieInput: QueryCommandInput = {
      TableName: process.env.MOVIE_TABLE_NAME,
    }


    if ("roleName" in queryParams) {
      commandInput = {
 ...commandInput,
        IndexName: "roleIx",
        KeyConditionExpression: "movieId = :m and begins_with(roleName, :r) ",
        ExpressionAttributeValues: {
          ":m": movieId,
          ":r": queryParams.roleName,
 },
 };
 } else if ("actorName" in queryParams) {
      commandInput = {
 ...commandInput,
        KeyConditionExpression: "movieId = :m and begins_with(actorName, :a) ",
        ExpressionAttributeValues: {
          ":m": movieId,
          ":a": queryParams.actorName,
 },
 };
 } else if ("facts" in queryParams) { //The new else if statement for "facts" is experimental.
      movieInput = { //Maybe, just maybe?
...movieInput,
    KeyConditionExpression: "movieId = :m and begins_with(facts=true)",
    ExpressionAttributeValues: {
      ":m": movieId,
      //":f": queryParams.movieId, //this should be used for getMovieById
    },
  }; //Note, I genuinely do not see how data is supposed to be gotten from one table to the other and then deconstructed and returned with the rest. Will ask in class on monday.

}
 else {
      commandInput = {
 ...commandInput,
        KeyConditionExpression: "movieId = :m",
        ExpressionAttributeValues: {
          ":m": movieId,
 },
 };
 }

    const commandOutput = await ddbDocClient.send(
      new QueryCommand(commandInput)
 );

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
 },
      body: JSON.stringify({
        data: commandOutput.Items,
 }),
 };
 } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
 },
      body: JSON.stringify({ error }),
 };
 }
};

function createDocumentClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
 };
  const unmarshallOptions = {
    wrapNumbers: false,
 };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
