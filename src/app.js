import _ from 'lodash';

const oauth = require('simple-oauth2');

import { getAuthUrl, getTokenFromCode, refreshAccessToken } from './authHelper';
import {
  addUser,
  addAttendees,
  syncEvents,
  refreshTokens,
  authorize,
  getLoginUrl,
} from './api';

module.exports.login = (event, context, cb) => {
  const bucket = _.get(event, 'stageVariables.home_bucket');
  const userName = _.get(event, 'queryStringParameters.id');
  const stage = _.get(event, 'requestContext.stage');
  const scope = process.env.scope;
  const redirectPath = process.env.redirect_path;
  const clientKeyTpl = process.env.client_key;
  const redirectUrl = `https://${event.headers.Host}/${stage}/${redirectPath}`;
  getLoginUrl(userName, bucket, clientKeyTpl, redirectUrl, scope).then((url) => {
    cb(null, { statusCode: 302, headers: { location: url } });
  }).catch((err) => {
    cb(null, { statusCode: 500, headers: { 'Content-Type': 'text/html' }, body: JSON.stringify(err) });
  });
};

module.exports.authorize = (event, context, cb) => {
  const bucket = _.get(event, 'stageVariables.home_bucket');
  const userName = _.get(event, 'queryStringParameters.state');
  const code = _.get(event, 'queryStringParameters.code');
  const host = _.get(event, 'headers.Host');
  const stage = _.get(event, 'requestContext.stage');
  const redirectPath = process.env.redirect_path;
  const clientKeyTpl = process.env.client_key;
  const tokenKeyTpl = process.env.token_key;
  const scope = process.env.scope;
  const redirectUrl = `https://${host}/${stage}/${redirectPath}`;

  console.log(`The code is ${code}`);
  console.log(`The redirect url is ${redirectUrl}`);
  console.log(`The scope is ${scope}`);

  authorize(userName, bucket, clientKeyTpl, tokenKeyTpl, code, redirectUrl, scope).then(() => {
    console.log(`Success to authorize, user is ${userName}`);
    cb(null, { statusCode: 200, headers: {}, body: 'Success to login' });
  }).catch((err) => {
    console.log(`Failed to authorize,error message is ${err}`);
    cb(null, { statusCode: 500, headers: {}, body: 'Failed to authorize' });
  });
};

module.exports.refresh_token = (event) => {
  const bucket = process.env.home_bucket;
  const userHomeKey = process.env.user_home_key;
  const clientKeyTpl = process.env.client_key;
  const tokenKeyTpl = process.env.token_key;
  refreshTokens(bucket, userHomeKey, clientKeyTpl, tokenKeyTpl).then(() => {
    console.log('Success to refresh token');
  }).catch((err) => {
    console.log(`Failed to refresh token,error is ${err}`);
  });
};

module.exports.sync_events = (event) => {
  const bucket = process.env.home_bucket;
  const processedEventsKey = process.env.processed_events_key;
  const userHomeKey = process.env.user_home_key;
  const userInfoKeyTpl = process.env.user_info_key;
  const srcTokenKeyTpl = process.env.src_token_key;
  const tgtTokenKeyTpl = process.env.tgt_token_key;
  const syncDays = process.env.sync_days;
  const attendeesKey = process.env.attendees_key;

  syncEvents(bucket,
    processedEventsKey,
    userHomeKey,
    userInfoKeyTpl,
    srcTokenKeyTpl,
    tgtTokenKeyTpl,
    syncDays,
    attendeesKey,
  ).then(() => {
    console.log('Success to sync events');
  }).catch((err) => {
    console.log(`Failed to sync events, error message is ${err}`);
  });
};

module.exports.add_attendee = (event, context, cb) => {
  const bucket = _.get(event, 'stageVariables.home_bucket');
  const attendeesKey = _.get(event, 'stageVariables.attendees_key');
  const newAttendees = JSON.parse(event.body);
  if (_.isNull(newAttendees)) {
    cb(null, { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Request body is null' });
    console.log('Request body is null');
    return false;
  }
  console.log(`New attendees is ${newAttendees}`);
  addAttendees(newAttendees, bucket, attendeesKey)
      .then(() => {
        cb(null, { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: 'Success to add attendees' });
        console.log('Success to add attendee');
      }).catch((err) => {
        cb(null, { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(err) });
        console.log(`Failed to add attendee, error message is ${err}`);
      });
};

module.exports.add_user = (event, context, cb) => {
  console.log(event);
  const newUser = JSON.parse(event.body);
  if (_.isNull(newUser)) {
    cb(null, { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Request body is null' });
    console.log('Request body is null');
    return false;
  }

  const googleClient = {
    id: process.env.google_client_id,
    secret: process.env.google_client_secret,
  };

  const outlookClient = {
    id: process.env.outlook_client_id,
    secret: process.env.outlook_client_secret,
  };

  console.log(`New user is ${newUser}`);
  const bucket = _.get(event, 'stageVariables.home_bucket');
  const userInfoKeyTpl = _.get(event, 'stageVariables.user_info_key');
  const googleClientKeyTpl = _.get(event, 'stageVariables.google_client_key');
  const outlookClientKeyTpl = _.get(event, 'stageVariables.outlook_client_key');
  addUser(newUser, bucket, userInfoKeyTpl, googleClientKeyTpl, outlookClientKeyTpl, googleClient, outlookClient)
    .then(() => {
      cb(null, { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Success to add user' });
      console.log('Success to add user');
    })
    .catch((err) => {
      cb(null, { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(err) });
      console.log(`Failed to add user, error message is ${err}`);
    });
};
