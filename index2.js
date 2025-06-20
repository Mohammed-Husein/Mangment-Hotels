const {MongoClient}=require('mongodb');

const url = "mongodb+srv://ma6018950:nodejs@learn-mongodb.klomiwz.mongodb.net/?retryWrites=true&w=majority&appName=learn-mongodb"

const client=new MongoClient(url);

const main =  async()=>{
    await client.connect();
    console.log("Connected successfully to server");
    const db = client.db("codeZone");
    const collection = db.collection("courses");
        const result = await collection.insertOne({title:"node",price:205});

    const data = await collection.find().toArray();
    console.log("dataaaaaa",data);
}

main();