
export default function handler(req,res){

res.status(200).json([
{id:1,status:'scheduled'},
{id:2,status:'in delivery'},
{id:3,status:'completed'}
])

}
