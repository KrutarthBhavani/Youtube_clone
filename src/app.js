import express from "express";
import connectDB from "./db/index.js";
import cors from 'cors';
import cookieParser from "cookie-parser";

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
})) // app.use mostly use when you use middleware


app.use(express.json({limit:"16kb"}))
// This is an option passed to express.json() middleware that specifies the maximum allowed size of the JSON body in the incoming request. 
// If the body of the request is larger than 16 kilobytes, the server will respond with a 413 Request Entity Too Large error. 
/* Setting a limit like this helps protect your server against denial of service (DoS) attacks, where an attacker might try to send very 
    large requests to crash the server or make it run out of memory.*/

/*  So, in summary, app.use(express.json({limit:"16kb"})) tells your Express app to automatically parse the JSON-formatted request bodies, 
    but only if the body is under 16 kilobytes. This makes handling JSON inputs much more straightforward and improves the security and 
    efficiency of your server by preventing excessively large payloads from being processed.*/



app.use(express.urlencoded({extended: true, limit: "16kb"}))
/* tells your Express app to parse URL-encoded bodies of incoming requests (like those from HTML forms), 
    allowing for complex objects and arrays,  with a maximum size limit of 16 kilobytes for the parsed body.
    This is crucial for handling form submissions in your web applications securely and efficiently. */


app.use(express.static("public")) //

app.use(cookieParser()) // user na browser ni cookie access OR set karva mate aano use thay chhe
/*This is particularly useful for handling sessions, tracking user activity, or managing user preferences, 
 enhancing both the functionality and security of your web applications.*/



 //routes import

import userRouter from './routes/user.routes.js'

//routes declration
app.use("/api/v1/users", userRouter)

export {app} 