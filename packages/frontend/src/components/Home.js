import React from "react";
import { Grid, Button, Statistic, Loader, Segment,Icon,} from "semantic-ui-react";
import { Link } from "react-router-dom";
import { useQuery } from "react-apollo";
import { utils } from "ethers";
import { convertWeiToDollars, getShareValue } from "../helpers/currency";
import gql from "graphql-tag";

const NumMembers = () => (
  <Link to="/members" className="link">
    <Button color="grey" size="medium" fluid>
      Members
    </Button>
  </Link>
);

const NumProposals = () => (
  <Link to="/proposals" className="link">
    <Button color="grey" size="medium" fluid>
      Proposals
    </Button>
  </Link>
);

const GET_METADATA = gql`
  {
    exchangeRate @client
    totalShares @client
    guildBankValue @client
  }
`;

const Home = () => {
  const { loading, error, data } = useQuery(GET_METADATA);
  if (loading) return <Loader size="massive" active />;
  if (error) throw new Error(error);
  const { guildBankValue, exchangeRate, totalShares, } = data;

  const shareValue = getShareValue(totalShares, guildBankValue);
  console.log("metadata: ", data);

  return (
    <div id="homepage">
       <Grid.Column width={4} id="navigation">
            <Grid container doubling stackable columns={4} padded textAlign="center" >
              <Grid.Column></Grid.Column>
              <Grid.Column></Grid.Column>
              <Grid.Column id="navElement1">
                <NumMembers />
              </Grid.Column>
              <Grid.Column id="navElement2">
                <NumProposals />
              </Grid.Column>
            </Grid>
          </Grid.Column>

      <Segment id="homeSegment1">
      <Grid container textAlign="center">
        <Grid container doubling stackable columns="equal" padded>
          <Grid.Column>
            <Grid.Row className="guild_value" textAlign="center">
                <Statistic>
                  <h1 id="mainHeader">TOTAL GUILD BANK BALANCE</h1>
                  <Statistic.Value id="bankBalance">
                    {convertWeiToDollars(guildBankValue, exchangeRate)} USD
                  </Statistic.Value>
                  <h2 id="ethExchange"><Icon name='ethereum' />{parseFloat(utils.formatEther(guildBankValue)).toFixed(4)} ETH</h2>
                </Statistic>
            </Grid.Row>
          </Grid.Column>
        </Grid>
      </Grid>
      </Segment>
      
      <Segment id="homeSegment2">
        <Grid container doubling stackable columns={2}>
          <Grid.Column textAlign="center">
            <Statistic label="Total Shares" value={totalShares} />
          </Grid.Column>
          <Grid.Column textAlign="center">
            <Statistic
              label="Share Value"
              value={convertWeiToDollars(shareValue, exchangeRate)}
            />
          </Grid.Column>
        </Grid>
      </Segment>
    </div>
  );
};

export default Home;
