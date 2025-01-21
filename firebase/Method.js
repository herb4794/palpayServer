import { auth } from "firebase-admin"
import { adminApp } from "./config"

let admin = auth(adminApp).listUsers(1000).then((result) =>{
  const user = result.users
  console.log(user)
})

export default admin
