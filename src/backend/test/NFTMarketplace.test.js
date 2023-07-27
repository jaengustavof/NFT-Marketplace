const { expect } = require('chai');
const { ethers } = require('hardhat');

const toWei = (num) => ethers.utils.parseEther(num.toString());
const fromWei = (num) => ethers.utils.formatEther(num);

describe("NFTMarketplace", function(){

    let NFT;
    let nft;
    let Marketplace;
    let marketplace;
    let deployer;
    let addr1;
    let addr2;
    let addrs;
    let feePercent = 1;
    let URI = "sample URI";

    beforeEach(async function(){

        NFT = await ethers.getContractFactory("NFT"); // ubicado en la carpeta backend/contract
        Marketplace = await ethers.getContractFactory("Marketplace"); // ubicado en la carpeta backend/contract
        [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();

        nft = await NFT.deploy();
        marketplace = await Marketplace.deploy(feePercent);

    }) //Antes de cada testing obtenemos los SC


    describe("Deployment", function (){

        it("Should track name and Symbol from NFT", async function () {

            const nftName = "DApp NFT"; //NFT.sol
            const nftSymbol = "DAPP"; //NFT.sol
            expect(await nft.name()).to.equal(nftName);
            expect(await nft.symbol()).to.equal(nftSymbol);

        });

        it("Should track feeAccount and feePercent of the Marketplace", async function(){

            expect(await marketplace.feeAccount()).to.equal(deployer.address);
            expect(await marketplace.feePercent()).to.equal(feePercent);
        });
    });

    describe("Minting NFTs", function() {
        
        it("Should track each minted NFT", async function() {

            await nft.connect(addr1).mint(URI); //creamos un nft con su URI(imagen)
            expect(await nft.tokenCount()).to.equal(1); //controlamos que exista 1 nft en el totalCount
            expect(await nft.balanceOf(addr1.address)).to.equal(1); //Esperamos que haya al menos 1 NFT en el account
            expect(await nft.tokenURI(1)).to.equal(URI); //Controlamos que el URI sea el mismo que enviamos en la linea 54

            await nft.connect(addr2).mint(URI); //creamos un nft con su URI(imagen)
            expect(await nft.tokenCount()).to.equal(2); //controlamos que exista 2 nft en el totalCount ya que creamos 1 para el usuario anterior
            expect(await nft.balanceOf(addr1.address)).to.equal(1); //Esperamos que haya al menos 1 NFT en el account del usuario
            expect(await nft.tokenURI(2)).to.equal(URI); //Controlamos que el URI sea el mismo que enviamos en la linea 59

        });
    });
   
    describe("Making Marketplace items", function(){

        let price = 1;
        let result;

        beforeEach(async function() {
            await nft.connect(addr1).mint(URI) // mint de un nuevo NFT
            await nft.connect(addr1).setApprovalForAll(marketplace.address, true); // le damos el poder al marketplace para que gestione todos los nfts de esta cuenta. setApprovalForAll es una funcion que hereda el contrato NFT por ser ERC721URIStorage. Espera un address y un bool.


        });

        it("Should track newly created item", async function(){
            await expect(marketplace.connect(addr1).makeItem(nft.address, 1, toWei(price))) //crea el item
            .to.emit(marketplace, "Offered") //Emite el evento luego de crear el Item
            .withArgs( //define los argumentos del evento
                1,
                nft.address,
                1,
                toWei(price),
                addr1.address
            );

            expect(await nft.ownerOf(1)).to.equal(marketplace.address); //verificamos que el nft con id 1 pertenezca al maketplace.
            expect(await marketplace.itemCount()).equal(1) // confirmamos que el marketplace ahora tiene 1 item
            const item = await marketplace.items(1); //hace referencia al item con id 1 del mapping items
            expect(item.itemId).to.equal(1); //el item id 1 debe ser igual a 1
            expect(item.nft).to.equal(nft.address);
            expect(item.tokenId).to.equal(1); //el token id tambien debe ser 1
            expect(item.price).to.equal(toWei(price));
            expect(item.sold).to.equal(false);
        });

        it("Sould fail if price is set to zero", async function(){
            await expect(marketplace.connect(addr1).makeItem(nft.address, 1, 0)).to.be.revertedWith("Price must be grater than 0")
        });

    });

    describe("Purchasing marketplace items", function () {

        let price = 2;
        let fee = (feePercent/100)*price;
        let totalPriceInWei;

        beforeEach(async function(){
            await nft.connect(addr1).mint(URI);
            await nft.connect(addr1).setApprovalForAll(marketplace.address, true); //damos el poder al marketplace para que gestione todos los nft
            await marketplace.connect(addr1).makeItem(
                nft.address,
                1,
                toWei(price)
            );
        });

        it("Should update item sold, pay seller, transfer to buyer", async function(){
            const sellerInitialEthBalance = await addr1.getBalance(); //balance del vendedor
            const feeAccountInitialEthBalance = await deployer.getBalance(); //balance del owner del contrato

            totalPriceInWei = await marketplace.getTotalPrice(1);
            await expect(marketplace.connect(addr2).purchaseItem(1, {value: totalPriceInWei})).to.emit(marketplace, "Bought").withArgs(
                1,
                nft.address,
                1,
                toWei(price),
                addr1.address,
                addr2.address
            );

            const sellerFinalEthBalance = await addr1.getBalance();
            const feeAccountFinalEthBalance = await deployer.getBalance();

            expect((await marketplace.items(1)).sold).to.equal(true); //El item ha sido vendido
            expect(+fromWei(sellerFinalEthBalance)).to.equal(+price + +fromWei(sellerInitialEthBalance)); //comprobamos que el balance final sea igual al precio + el balance inicial

            expect(+fromWei(feeAccountFinalEthBalance)).to.equal(+fee + +fromWei(feeAccountInitialEthBalance));

            expect(await nft.ownerOf(1)).to.equal(addr2.address);
        })
    })
});