import asyncHandler from '../utils/asyncHandler.js'

const registerUser = asyncHandler(async (req, res) => {
const {username, email, fullName, password} = req.body                     

console.log(`email: ${email} `);


})

export {
    registerUser
}