import React, { useCallback, useState, useEffect } from "react";
import { Grid, Segment, Button, Image, Loader, Label } from "semantic-ui-react";
import { Link } from "react-router-dom";
import hood from "assets/hood.png";
import ProgressBar from "./ProgressBar";
import { useQuery } from "react-apollo";
import { ProposalStatus, getProposalCountdownText } from "../helpers/proposals";
import { getMoloch } from "../web3";
import { convertWeiToDollars, getShareValue } from "../helpers/currency";
import { utils } from "ethers";
import Linkify from "react-linkify";
import ProfileHover from "profile-hover";
import { monitorTx } from "../helpers/transaction";
import gql from "graphql-tag";

export const Vote = {
  Null: 0, // default value, counted as abstention
  Yes: 1,
  No: 2,
};

const MemberAvatar = ({ member }) => {
  return (
    <Grid.Column
      mobile={4}
      tablet={3}
      computer={3}
      textAlign="center"
      className="member_avatar"
      title={member}
    >
      <Link to={`/members/${member}`} className="uncolored">
        <Image src={hood} centered />
        <p className="name">
          {!member ? "" : member.length > 10 ? member.substring(0, 10) + "..." : member}
        </p>
      </Link>
    </Grid.Column>
  );
};

const GET_PROPOSAL_DETAIL = gql`
  query Proposal($id: String!, $delegateKey: String!) {
    proposal(id: $id) {
      id
      applicantAddress
      memberAddress
      timestamp
      tokenTribute
      sharesRequested
      processed
      didPass
      aborted
      yesVotes
      noVotes
      yesShares
      noShares
      proposalIndex
      votes(first: 100) {
        member {
          id
          shares
        }
        uintVote
      }
      details
      startingPeriod
      processed
      status @client
      title @client
      description @client
      gracePeriod @client
      votingEnds @client
      votingStarts @client
      readyForProcessing @client
    }
    members(where: { delegateKey: $delegateKey }) {
      id
      shares
      isActive
      tokenTribute
      delegateKey
    }
    exchangeRate @client
    totalShares @client
    guildBankValue @client
    currentPeriod @client
    proposalQueueLength @client
  }
`;

const ProposalDetail = ({ loggedInUser, match }) => {
  const [moloch, setMoloch] = useState();

  useEffect(() => {
    async function init() {
      const m = await getMoloch(loggedInUser);
      setMoloch(m);
    }
    init();
  }, []);
  const handleNo = useCallback(
    async proposal => {
      monitorTx(moloch.submitVote(proposal.proposalIndex, Vote.No));
    },
    [moloch],
  );

  const handleYes = useCallback(
    async proposal => {
      monitorTx(moloch.submitVote(proposal.proposalIndex, Vote.Yes));
    },
    [moloch],
  );

  const handleProcess = useCallback(
    async proposal => {
      monitorTx(moloch.processProposal(proposal.proposalIndex));
    },
    [moloch],
  );

  const { loading, error, data } = useQuery(GET_PROPOSAL_DETAIL, {
    variables: { id: match.params.id, delegateKey: loggedInUser },
  });
  console.log("proposalDetail: ", data);
  if (loading) return <Loader size="massive" active />;
  if (error) throw new Error(`Error!: ${error}`);

  const {
    proposal,
    exchangeRate,
    totalShares,
    guildBankValue,
    members,
  } = data;

  const shareValue = getShareValue(totalShares, guildBankValue);

  const user = members.length > 0 ? members[0] : null;
  const userHasVoted = proposal.votes.find(vote => vote.member.id === loggedInUser) ? true : false;
  const cannotVote =
    proposal.aborted ||
    userHasVoted ||
    proposal.status !== ProposalStatus.VotingPeriod ||
    (!(user && user.shares) || !(user && user.isActive));

  return (
    <div id="proposal_detail">
      <Segment>
        <Label as='a' color='white' ribbon>
          <span>{getProposalCountdownText(proposal)}</span>
        </Label>
     
      <Grid container  /*  TITLE */> 
        <Grid.Column>
          <Grid.Row>
            <h1 className="title">{proposal.title ? proposal.title : "N/A"}</h1>
          </Grid.Row>
          <Grid.Row>
            <Linkify properties={{ target: "_blank" }}>
              <div className="subtext description wordwrap">
                {proposal.description ? proposal.description : "N/A"}
              </div>
            </Linkify>
          </Grid.Row>
        </Grid.Column>
      </Grid>

      <Grid container stackable columns={2} /*  Applicaln and Proposer */>
        <Grid.Column>
            <h3>Proposal Details</h3>
          <Grid container>
            <Grid container stackable columns={2} doubling>
              <Grid.Column>
                <p className="subtext">Applicant/Beneficiary</p>
                <ProfileHover address={proposal.applicantAddress} displayFull="true" />
              </Grid.Column>
              <Grid.Column>
                <p className="subtext">Proposer</p>
                <ProfileHover
                  address={proposal.memberAddress}
                  displayFull="true"
                  url={`https://molochdao.com/members/${proposal.memberAddress}`}
                />
              </Grid.Column>
            </Grid>

            <Segment raised className="amountDetails"/* Details Segment */ >

            <Grid container columns={2} /* Tribute Row */>
                <Grid.Row>
                  <Grid.Column>
                    <p className="amount">Tribute</p>
                  </Grid.Column>
                  <Grid.Column>
                    <p className="amount">{utils.formatEther(proposal.tokenTribute)} DAI</p>
                  </Grid.Column>
                </Grid.Row>
              </Grid>

              <Grid.Row> 
              <Grid container columns={2} /* Shares Row */>
                <Grid.Row>
                  <Grid.Column>
                    <p className="amount">Shares</p>
                  </Grid.Column>
                  <Grid.Column>
                    <p className="amount">{proposal.sharesRequested}</p>
                  </Grid.Column>
                </Grid.Row>
              </Grid>

              <Grid.Row> 
              <Grid container columns={2} /* Total value Row */ >
                <Grid.Row>
                  <Grid.Column>
                    <p className="amount">Total value</p>
                  </Grid.Column>
                  <Grid.Column>
                    <p className="amount">
                    {convertWeiToDollars(
                      utils
                        .bigNumberify(proposal.sharesRequested)
                        .mul(shareValue)
                        .toString(),
                      exchangeRate,
                    )}
                  </p>
                  </Grid.Column>
                </Grid.Row>
              </Grid>
            </Grid.Row>

            </Grid.Row>
            </Segment>
          </Grid>
        </Grid.Column>

        <Grid.Column>
        <h3>Vote now</h3>
          <Grid container>
            <Grid.Row>
              <Grid.Column textAlign="center">
                {proposal.aborted ? (
                  <p className="amount">Aborted</p>
                ) : (
                  <ProgressBar yes={proposal.yesShares} no={proposal.noShares} />
                )}
              </Grid.Column>
            </Grid.Row>

            
            <Grid.Row>
              <Grid container stackable columns={3}>
                <Grid.Column textAlign="left">
                  <Button
                    className="btn"
                    color="green"
                    size="mediun"
                    disabled={cannotVote}
                    onClick={() => handleYes(proposal)}
                  >
                    Vote Yes
                  </Button>
                </Grid.Column>
                <Grid.Column textAlign="left">
                  <Button
                    className="btn"
                    color="red"
                    size="medium"
                    disabled={cannotVote}
                    onClick={() => handleNo(proposal)}
                  >
                    Vote No
                  </Button>
                </Grid.Column>
                <Grid.Column textAlign="left">
                  <Button
                    className="btn"
                    color="grey"
                    size="medium"
                    onClick={() => handleProcess(proposal)}
                    disabled={proposal.status !== ProposalStatus.ReadyForProcessing}
                  >
                    Process Proposal
                  </Button>
                </Grid.Column>
              </Grid>
            </Grid.Row>
          </Grid>
        </Grid.Column>
        
        <Grid.Column>
          <h3>Members who voted</h3>
          <Grid container>
            <Grid.Row>
              <Grid.Column className="member_list">
                {proposal.votes.length > 0 ? (
                  <Grid>
                    <Grid.Row className="members_row">
                      {/* centered */}
                      {proposal.votes.map((vote, idx) => (
                        <MemberAvatar
                          member={vote.member.id}
                          shares={vote.member.shares}
                          key={idx}
                        />
                      ))}
                    </Grid.Row>
                  </Grid>
                ) : null}
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </Grid.Column>
      </Grid>
      </Segment>
    </div>
  );
};

export default ProposalDetail;
