import React, { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Fade,
  Grid,
  Grow,
  Slide,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import SecurityIcon from "@mui/icons-material/Security";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import StorageIcon from "@mui/icons-material/Storage";
import ExtensionIcon from "@mui/icons-material/Extension";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import InsightsIcon from "@mui/icons-material/Insights";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EastIcon from "@mui/icons-material/East";
import CodeIcon from "@mui/icons-material/Code";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";

const LandingPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [showHeader, setShowHeader] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowHeader(true), 300);
    return () => clearTimeout(t);
  }, []);

  const iconContainerStyle = {
    height: 140,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      theme.palette.mode === "dark"
        ? theme.palette.grey[800]
        : theme.palette.grey[200],
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    transition: "background 0.3s",
    "& svg": {
      transition: "transform 0.35s",
    },
  };

  const cardStyle = {
    height: "100%",
    transition: "transform 0.35s, box-shadow 0.35s",
    "&:hover": {
      transform: "translateY(-8px) scale(1.06)",
      boxShadow: theme.shadows[6],
      "& svg": {
        transform: "scale(1.18)",
      },
    },
    borderRadius: 2,
    overflow: "hidden",
  };

  const accordionStyle = {
    transition: "transform 0.25s, background 0.25s",
    "&:hover": {
      transform: "translateY(-3px)",
      background:
        theme.palette.mode === "dark"
          ? theme.palette.grey[800]
          : theme.palette.grey[100],
    },
  };

  const stepBoxStyle = {
    px: 2,
    py: 0.5,
    borderRadius: 2,
    fontWeight: "bold",
    whiteSpace: "nowrap",
    background:
      theme.palette.mode === "dark"
        ? theme.palette.primary.dark
        : theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
    transition: "transform 0.3s",
    "&:hover": {
      transform: "scale(1.05)",
    },
  };

  const animatedLinkStyle = {
    color: "inherit",
    textDecoration: "none",
    display: "inline-block",
    transition: "transform 0.3s",
    "&:hover": {
      transform: "scale(1.05)",
      color: "primary.main",
      textDecoration: "underline",
    },
  };

  const animatedLinkStyle1 = {
    ...animatedLinkStyle,
    textDecoration: "underline",
    mt: 4,
  };

  const pipelineSteps = ["Ask", "Retrieve", "Augment", "Generate", "Enjoy"];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          theme.palette.mode === "dark"
            ? theme.palette.grey[900]
            : theme.palette.grey[100],
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
      }}
    >
      <Container maxWidth="lg" sx={{ pt: 6, pb: 6 }}>
        <Fade in={showHeader} timeout={800}>
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography
              variant={isMobile ? "h3" : "h2"}
              component="h1"
              gutterBottom
              sx={{
                fontWeight: "bold",
                textShadow: "1px 1px 2px rgba(0,0,0,0.3)",
                color: theme.palette.mode === "dark" ? "white" : "black",
              }}
            >
              Welcome to David Nguyen&rsquo;s AI Assistant – Lumina!
            </Typography>

            <Typography variant="h6" color="textSecondary" sx={{ mb: 1 }}>
              Your personalized portal for everything about{" "}
              <strong>Son&nbsp;(David) Nguyen</strong> – plus a whole world of
              general knowledge. Powered by Retrieval‑Augmented Generation,
              Pinecone vector search, LangChain orchestration &amp; cutting‑edge
              language models, Lumina delivers instant, context‑rich answers to
              any question you throw at it 👨🏻‍💻
            </Typography>
          </Box>
        </Fade>

        <Slide in timeout={800} direction="up">
          <Box sx={{ mt: 6 }}>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={{
                fontWeight: "bold",
                mb: 1,
                color: theme.palette.mode === "dark" ? "white" : "black",
              }}
            >
              Key Features
            </Typography>
            <Typography
              variant="subtitle1"
              align="center"
              color="textSecondary"
              sx={{ mb: 4 }}
            >
              Experience personalized, secure, and lightning‑fast AI assistance.
            </Typography>

            <Grid container spacing={4}>
              <Grid item xs={12} sm={6} md={4}>
                <Grow in timeout={900}>
                  <Card elevation={3} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <ChatBubbleOutlineIcon
                        sx={{ fontSize: 60, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6">
                        Save Conversations
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Create an account to save and manage chat history
                        effortlessly.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Grow in timeout={1000}>
                  <Card elevation={3} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <FlashOnIcon
                        sx={{ fontSize: 60, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6">
                        Instant Responses
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Get immediate AI‑generated answers for any query.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Grow in timeout={1100}>
                  <Card elevation={3} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <SecurityIcon
                        sx={{ fontSize: 60, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6">
                        Secure &amp; Reliable
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        End‑to‑end encrypted chats keep your data private.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
            </Grid>
          </Box>
        </Slide>

        <Slide in timeout={800} direction="up">
          <Box sx={{ mt: 10 }}>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={{
                fontWeight: "bold",
                mb: 1,
                color: theme.palette.mode === "dark" ? "white" : "black",
              }}
            >
              Advanced Capabilities
            </Typography>
            <Typography
              variant="subtitle1"
              align="center"
              color="textSecondary"
              sx={{ mb: 4 }}
            >
              RAG, Pinecone vector search, and LangChain orchestration combine
              so Lumina can retrieve, reason, and respond with depth.
            </Typography>

            <Grid container spacing={4}>
              <Grid item xs={12} sm={6} md={4}>
                <Grow in timeout={900}>
                  <Card elevation={3} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <AutoAwesomeIcon
                        sx={{ fontSize: 60, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6">
                        RAG‑Powered Knowledge
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Retrieval‑Augmented Generation enriches every answer
                        with relevant context.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Grow in timeout={1000}>
                  <Card elevation={3} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <StorageIcon
                        sx={{ fontSize: 60, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6">
                        Pinecone Vector Search
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Blazing‑fast similarity search retrieves the most
                        pertinent information in milliseconds.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Grow in timeout={1100}>
                  <Card elevation={3} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <ExtensionIcon
                        sx={{ fontSize: 60, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6">
                        LangChain Orchestration
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Modular chains manage retrieval, reasoning, and
                        generation for seamless AI flows.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
            </Grid>
          </Box>
        </Slide>

        <Slide in timeout={800} direction="up">
          <Box sx={{ mt: 10 }}>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={{
                fontWeight: "bold",
                mb: 1,
                color: theme.palette.mode === "dark" ? "white" : "black",
              }}
            >
              How It Works
            </Typography>

            {/* Pipeline badges */}
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                alignItems: "center",
                gap: 1.5,
                mb: 4,
              }}
            >
              {pipelineSteps.map((step, idx) => (
                <React.Fragment key={step}>
                  <Box sx={stepBoxStyle}>{step}</Box>
                  {idx !== pipelineSteps.length - 1 && (
                    <EastIcon
                      sx={{
                        fontSize: 24,
                        color: theme.palette.text.secondary,
                        mb: "-2px",
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </Box>

            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Grow in timeout={900}>
                  <Card elevation={3} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <TipsAndUpdatesIcon
                        sx={{ fontSize: 60, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography variant="h6" gutterBottom>
                        1&nbsp;&nbsp;•&nbsp;&nbsp;Ask Anything
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Pose a question about David Nguyen or any topic.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>

              <Grid item xs={12} md={4}>
                <Grow in timeout={1000}>
                  <Card elevation={3} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <InsightsIcon
                        sx={{ fontSize: 60, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography variant="h6" gutterBottom>
                        2&nbsp;&nbsp;•&nbsp;&nbsp;Retrieve &amp; Augment
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Lumina fetches relevant context via Pinecone and
                        improves it with RAG.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>

              <Grid item xs={12} md={4}>
                <Grow in timeout={1100}>
                  <Card elevation={3} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <FlashOnIcon
                        sx={{ fontSize: 60, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography variant="h6" gutterBottom>
                        3&nbsp;&nbsp;•&nbsp;&nbsp;Generate Response
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        A polished answer is crafted and delivered instantly.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
            </Grid>
          </Box>
        </Slide>

        <Slide in timeout={800} direction="up">
          <Box sx={{ mt: 10 }}>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={{
                fontWeight: "bold",
                mb: 1,
                color: theme.palette.mode === "dark" ? "white" : "black",
              }}
            >
              Developer‑Centric Tools
            </Typography>
            <Typography
              variant="subtitle1"
              align="center"
              color="textSecondary"
              sx={{ mb: 4 }}
            >
              OpenAPI‑first design, containerized deployment, and modular
              architecture make Lumina easy to extend and integrate.
            </Typography>

            <Grid container spacing={4}>
              <Grid item xs={12} sm={6} md={4}>
                <Grow in timeout={900}>
                  <Card elevation={3} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <CodeIcon
                        sx={{ fontSize: 60, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6">
                        OpenAPI &amp; Swagger
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Auto‑generated docs and client SDKs with the included
                        OpenAPI spec and Swagger UI.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Grow in timeout={1000}>
                  <Card elevation={3} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <CloudDoneIcon
                        sx={{ fontSize: 60, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6">
                        Dockerized Deployment
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Spin up the entire stack locally or in production with a
                        single <code>docker‑compose up</code>.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Grow in timeout={1100}>
                  <Card elevation={3} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <BuildCircleIcon
                        sx={{ fontSize: 60, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6">
                        Modular Monorepo
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Cleanly separated frontend, backend, and ML modules
                        streamline contributions and testing.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
            </Grid>
          </Box>
        </Slide>

        <Slide in timeout={800} direction="up">
          <Box sx={{ mt: 10 }}>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={{
                fontWeight: "bold",
                mb: 1,
                color: theme.palette.mode === "dark" ? "white" : "black",
              }}
            >
              Frequently Asked Questions
            </Typography>

            <Box sx={{ maxWidth: 900, mx: "auto", mt: 4 }}>
              {/* Q1 */}
              <Accordion sx={accordionStyle}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    How does Lumina differ from ChatGPT or Bard?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="textSecondary">
                    Lumina is hyper‑focused on David Nguyen and leverages a
                    bespoke knowledge base plus RAG, Pinecone, and LangChain to
                    tailor answers. You still get general knowledge, but with
                    personalized context and saved conversations.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              {/* Q2 */}
              <Accordion sx={accordionStyle}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    Can I use Lumina without creating an account?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="textSecondary">
                    Absolutely! Choose “Continue as Guest” to chat instantly.
                    Note that guest chats are not stored once you leave.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              {/* Q3 */}
              <Accordion sx={accordionStyle}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    Is my data secure?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="textSecondary">
                    Yes. Conversations are encrypted in transit and at rest.
                    Auth‑only data is stored securely in MongoDB with JWT‑based
                    access controls.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              {/* Q4 */}
              <Accordion sx={accordionStyle}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    How can I contribute to Lumina?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="textSecondary">
                    Lumina is open source! Check out the{" "}
                    <Box
                      component="a"
                      href="https://github.com/hoangsonww/AI-RAG-Assistant-Chatbot"
                      sx={{
                        textDecoration: "underline",
                        color: "primary.main",
                      }}
                    >
                      GitHub repository
                    </Box>{" "}
                    to report issues, suggest features, or submit pull requests.
                    We welcome contributions from the community.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              {/* Q5 */}
              <Accordion sx={accordionStyle}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    What technologies power Lumina?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="textSecondary">
                    Lumina is built with a modern stack including{" "}
                    <strong>React</strong> for the frontend,{" "}
                    <strong>Node.js</strong> and <strong>Express</strong> for
                    the backend, <strong>MongoDB</strong> for data storage,{" "}
                    <strong>Pinecone</strong> for vector search,{" "}
                    <strong>LangChain</strong> for orchestration, and more!
                  </Typography>
                </AccordionDetails>
              </Accordion>

              {/* Q6 */}
              <Accordion sx={accordionStyle}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    What can I do with Lumina?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="textSecondary">
                    You can ask Lumina about David Nguyen, his work, or any
                    general knowledge topic. It&rsquo;s designed to provide
                    personalized, context‑rich answers and save your chat
                    history for future reference. You can also use it as a
                    general AI assistant for various tasks, from answering
                    questions to providing recommendations. Feel free to create
                    an account to save your conversations and conveniently
                    access them later!
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Box>
          </Box>
        </Slide>

        <Fade in timeout={800}>
          <Box sx={{ mt: 10, textAlign: "center" }}>
            <Typography
              variant="h4"
              gutterBottom
              sx={{
                fontWeight: "bold",
                color: theme.palette.mode === "dark" ? "white" : "black",
              }}
            >
              Get Started Now
            </Typography>
            <Typography
              variant="subtitle1"
              color="textSecondary"
              sx={{ mb: 4 }}
            >
              Create an account to save conversations or jump right in as a
              guest.
            </Typography>

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={() => navigate("/signup")}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontWeight: "bold",
                  borderRadius: 2,
                  transition: "transform 0.3s",
                  "&:hover": { transform: "translateY(-4px) scale(1.05)" },
                }}
              >
                Create Account
              </Button>
              <Button
                variant="outlined"
                color="primary"
                size="large"
                onClick={() => navigate("/chat")}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontWeight: "bold",
                  borderRadius: 2,
                  transition: "transform 0.3s",
                  "&:hover": { transform: "translateY(-4px) scale(1.05)" },
                }}
              >
                Continue as Guest
              </Button>
              <Button
                variant="outlined"
                color="primary"
                size="large"
                onClick={() =>
                  (window.location.href =
                    "https://github.com/hoangsonww/AI-RAG-Assistant-Chatbot")
                }
                sx={{
                  px: 4,
                  py: 1.5,
                  fontWeight: "bold",
                  borderRadius: 2,
                  borderStyle: "dashed",
                  transition: "transform 0.3s",
                  "&:hover": { transform: "translateY(-4px) scale(1.05)" },
                }}
              >
                GitHub Repository
              </Button>
            </Box>

            <Typography variant="subtitle1" color="textSecondary">
              <Box component="a" href="/terms" sx={animatedLinkStyle1}>
                Terms of Service
              </Box>
            </Typography>
          </Box>
        </Fade>
      </Container>

      <Box
        component="footer"
        sx={{
          py: 2,
          backgroundColor: theme.palette.background.paper,
          textAlign: "center",
          mt: "auto",
        }}
      >
        <Typography variant="body1" color="textSecondary">
          © {new Date().getFullYear()}{" "}
          <Box
            component="a"
            href="https://sonnguyenhoang.com"
            sx={animatedLinkStyle}
          >
            David Nguyen&rsquo;s
          </Box>{" "}
          AI Assistant. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default LandingPage;
