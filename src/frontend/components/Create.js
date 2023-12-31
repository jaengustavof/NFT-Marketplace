import { useState } from "react";
import { ethers } from "ethers";
import { Row, Form, Button } from 'react-bootstrap';
import { create as ipfsHttpClient } from 'ipfs-http-client';

const projectId = '2SFSUpmPI68xGF8hJbufrqlW1vy';
const projectSecret = 'a55e8b33848f8f0f0fe6046d9043eb1e';
const credentials = projectId + ':' + projectSecret;
const encodedCredentials = btoa(credentials);
const authHeader = 'Basic ' + encodedCredentials;
const client = ipfsHttpClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https', headers: {
    authorization: authHeader}}); //nodo infura para conectar cliente IPFS

const Create = ({ marketplace, nft }) => {

    const [image, setImage] = useState('');
    const [price, setPrice] = useState(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // project ID - 3ecd8f60e2a64f2188c95c9e4b485b05
    // Secret - cac499f33e78471f811a87be965f00e8
    const uploadToIPFS = async (event) =>{
        event.preventDefault();
        const file = event.target.files[0];
        if(typeof file !== 'undefined') {
            try {
                const result = await client.add(file);
                console.log(result);
                setImage(`https://gustest.infura-ipfs.io/ipfs/${result.path}`);
                console.log(image)
            } catch (error) {
                console.log("ipfs image upload error: ", error);
                
            }
        }
    }

    const createNFT = async () => {
        if(!image || !price || !name || !description) return;

        try {

            const result = await client.add(JSON.stringify({ image, price, name, description }));
            mintThenList(result);

        } catch (error) {
            
            console.log("ipfs URI upload error: ", error);

        }
    }

    const mintThenList = async (result) =>{
        console.log(result)
        const uri = `https://gustest.infura-ipfs.io/ipfs/${result.path}`;
        await (await nft.mint(uri)).wait();

        const id = await nft.tokenCount();
        await (await nft.setApprovalForAll(marketplace.address, true));

        const listingPrice = ethers.utils.parseEther(price.toString());
        await (await marketplace.makeItem(nft.address, id, listingPrice)).wait();
    }

    return (
        <div className="container-fluid mt-5">
            <div className="row">
                <main role="main" className="col-lg-12 mx-auto" style={{ maxWidth: "1000px"}}>
                    <div className="content mx-auto">
                        <Row className="g-4">
                            <Form.Control type="file" required name="file" onChange={uploadToIPFS} />
                            <Form.Control onChange={(e) => setName(e.target.value)} size="lg" required type="text" placeholder="Name" />
                            <Form.Control onChange={(e) => setDescription(e.target.value)} size="lg" required as="textarea" placeholder="Description" />
                            <Form.Control onChange={(e) => setPrice(e.target.value)} size="lg" required type="numbre" placeholder="Price (ETH)" />
                            <div className="g-grid px-0">
                                <Button onClick={createNFT} variant="primary" size="lg">
                                    Create and list NFT
                                </Button>
                            </div>
                        </Row>
                    </div>
                </main>
            </div>
        </div>
    )

}

export default Create;


