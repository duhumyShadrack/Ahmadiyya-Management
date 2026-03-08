
export function processCommand(command:string){

if(command.includes('assign driver')){
return 'Driver assigned'
}

if(command.includes('create order')){
return 'Order created'
}

return 'Command not recognized'

}
