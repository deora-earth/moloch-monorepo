import React, { Component } from "react";
import {
  Button,
  Form,
  Grid,
  Input,
  Segment,
  Modal,
  Header,
  Icon,
  List,
} from "semantic-ui-react";
import { getMoloch, getToken, } from "../web3";
import { utils } from "ethers";
import { monitorTx } from "helpers/transaction";
import { getShareValue } from "../helpers/currency";
import { useQuery } from "react-apollo";
import gql from "graphql-tag";

const GET_METADATA = gql`
  {
    exchangeRate @client
    totalShares @client
    guildBankValue @client
  }
`;

class FundingModal extends Component {
  state = {
    loading: true,
    beneficiaryApproved: false,
    depositApproved: false,
    open: false,
  };

  handleOpen = async () => {
    const { valid } = this.props;
    if (!valid) {
      alert("Please fill any missing fields.");
      return;
    }
    this.setState({
      open: true,
    });
  }

  render() {
    const { loading, open } = this.state;
    const { handleSubmit, submittedTx } = this.props;
    return (
    <div id="proposal_submission">
      <Modal 
        trigger={
          <Button size="large" color="green" onClick={this.handleOpen} >
            <Icon name='send' color="white"/>  Submit a new proposal 
          </Button>
        }
        basic
        size="small"
        open={open}
      >
        <Header content="Submit your Founding Proposal" />
        <Modal.Content>
          <List>
            <List.Item>
              {submittedTx ? <List.Icon name="code" /> : <></>}
              <List.Content>
                {submittedTx ? (
                  <a
                    href={`https://etherscan.io/tx/${submittedTx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Transaction on Etherscan
                  </a>
                ) : (
                  <></>
                )}
              </List.Content>
            </List.Item>
          </List>
        </Modal.Content>
        <Modal.Actions>
          <Button
            basic
            color="green"
            inverted
            onClick={handleSubmit}
            disabled={submittedTx}
          >
            <Icon name="check" /> Submit
          </Button>
          <Button basic color="red" inverted onClick={this.handleClose}>
            <Icon name="remove" /> Close
          </Button>
        </Modal.Actions>
      </Modal>
    </div>
    );
  }
}

export default class FundingSubmission extends Component {
  state = {
    address: "",
    title: "",
    description: "",
    amount: "",
    tribute: "0", // TODO: this will be calculated with the blockchain
    fieldValidationErrors: { title: "", description: "", assets: "", amount: "" },
    titleValid: false,
    descriptionValid: false,
    amountValid: false,
    addressValid: false,
    formValid: false,
  };

  async componentDidMount() {
    const { loggedInUser } = this.props;
    const moloch = await getMoloch(loggedInUser);
    const token = await getToken(loggedInUser);
    this.setState({
      moloch,
      token,
    });
  }

  validateField = (fieldName, value) => {
    let {
      fieldValidationErrors,
      titleValid,
      descriptionValid,
      amountValid,
      addressValid,
    } = this.state;

    switch (fieldName) {
      case "title":
        titleValid = value && value !== "";
        fieldValidationErrors.title = titleValid ? "" : "Title is invalid";
        break;
      case "address":
        addressValid = utils.isHexString(value);
        console.log("utils.isHexString(value): ", utils.isHexString(value));
        console.log("value: ", value);
        fieldValidationErrors.address = addressValid ? "" : "Address is invalid";
        break;
      case "description":
        descriptionValid = value !== "";
        fieldValidationErrors.description = descriptionValid ? "" : "Description is invalid";
        break;
      case "amount":
        amountValid = value > 0;
        fieldValidationErrors.amount = amountValid ? "" : "Amount is invalid";
        break;
      default:
        break;
    }
    this.setState(
      {
        fieldValidationErrors,
        titleValid,
        descriptionValid,
        amountValid,
        addressValid,
      },
      this.validateForm,
    );
  };

  validateForm = () => {
    const { titleValid, descriptionValid, amountValid, addressValid } = this.state;
    this.setState({
      formValid: titleValid && descriptionValid && amountValid && addressValid,
    });
  };

  handleInput = event => {
    let name = event.target.name;
    let value = event.target.value;
    this.setState({ [event.target.name]: event.target.value }, () => {
      this.validateField(name, value);
    });
  };

  handleSubmit = async () => {
    const { moloch, address, title, description, amount, tribute } = this.state;
    const { guildBankValue, totalShares, } = useQuery(GET_METADATA);
    const { shares } = amount / getShareValue(totalShares, guildBankValue) ;

    let submittedTx;
    try {
      console.log(
        "Submitting proposal: ",
        address,
        utils.parseEther(tribute).toString(),
        shares,
        JSON.stringify({ title, description }),
      );
      monitorTx(
        moloch.submitProposal(
          address,
          utils.parseEther(tribute),
          shares,
          JSON.stringify({ title, description }),
        ),
      );
    } catch (e) {
      console.error(e);
      alert("Error processing proposal");
    }

    this.setState({
      submittedTx,
    });
  };

  render() {
    const {
      amount,
      tribute,
      title,
      description,
      address,
      token,
      formValid,
      moloch,
      titleValid,
      descriptionValid,
      amountValid,
      addressValid,
      submittedTx,
    } = this.state;
    const { loggedInUser } = this.props;
    return (
      <div id="proposal_submission">
        <Form>
          <Grid centered columns={16}>
            <Grid.Column mobile={16} tablet={16} computer={12}>
              <h1> New Funding Proposal </h1>
            </Grid.Column>
            <Grid.Row stretched>
              <Grid.Column mobile={16} tablet={16} computer={12}>
                <Input
                  id="titleInput"
                  name="title"
                  size="big"
                  placeholder="Proposal Title"
                  onChange={this.handleInput}
                  value={title}
                  error={!titleValid}
                />
              </Grid.Column>
            </Grid.Row>
            <Grid.Row stretched>
              <Grid.Column mobile={16} tablet={16} computer={12}>
                <Segment className="blurred box">
                  <Form.Input
                    name="address"
                    label="Applicant"
                    placeholder="Address"
                    fluid
                    onChange={this.handleInput}
                    value={address}
                    error={!addressValid}
                  />
                  <Form.Input
                    name="amount"
                    label="DAI Requested"
                    placeholder="DAI"
                    fluid
                    type="number"
                    onChange={this.handleInput}
                    value={amount}
                    error={!amountValid}
                  />
                </Segment>
              </Grid.Column>
            </Grid.Row>
            <Grid.Row>
              <Grid.Column mobile={16} tablet={16} computer={12}>
                <Grid columns="equal">
                  <Grid.Column>
                    <Segment className="blurred box">
                      <Form.TextArea
                        name="description"
                        label="Description"
                        placeholder="Type here"
                        rows={15}
                        onChange={this.handleInput}
                        value={description}
                        error={!descriptionValid}
                      />
                    </Segment>
                  </Grid.Column>
                </Grid>
              </Grid.Column>
            </Grid.Row>
            <Grid.Row>
              <Grid.Column mobile={16} tablet={8} computer={8} className="submit_button">
                {/* <Button size="large" color="red" onClick={this.handleSubmit}>
                  Submit Proposal
                </Button> */}
                <FundingModal
                  valid={formValid}
                  tribute={tribute}
                  address={address}
                  token={token}
                  moloch={moloch}
                  loggedInUser={loggedInUser}
                  handleSubmit={this.handleSubmit}
                  submittedTx={submittedTx}
                />
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </Form>
      </div>
    );
  }
}
