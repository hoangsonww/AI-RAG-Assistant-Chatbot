import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Fade,
  Slide,
  Typography,
  useTheme,
  useMediaQuery,
  Link as MuiLink,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { gradientTextSx, brandButtonSx } from "../components/auth/styles";

/**
 * TermsPage Component
 *
 * This page displays the comprehensive Terms and Conditions for Lumina AI.
 * Lumina AI is designed to provide dynamic insights into Son (David) Nguyen's professional background, skills, projects, and accomplishments.
 */
const TermsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDark = theme.palette.mode === "dark";

  const pageBackground = isDark
    ? `radial-gradient(circle at 15% 15%, ${alpha(
        theme.palette.primary.main,
        0.18,
      )}, transparent 45%),
       radial-gradient(circle at 85% 20%, ${alpha(
         theme.palette.info.main,
         0.16,
       )}, transparent 45%),
       linear-gradient(180deg, #0b0f1a 0%, #0f172a 60%, #111827 100%)`
    : `radial-gradient(circle at 15% 15%, ${alpha(
        theme.palette.primary.main,
        0.12,
      )}, transparent 45%),
       radial-gradient(circle at 85% 20%, ${alpha(
         theme.palette.info.main,
         0.1,
       )}, transparent 45%),
       linear-gradient(180deg, #f8fafc 0%, #eef2ff 60%, #f8fafc 100%)`;

  const sectionHeadingSx = {
    fontWeight: 700,
    mt: 3.5,
    pl: 1.5,
    borderLeft: `3px solid ${theme.palette.primary.main}`,
    color: isDark ? "#fff" : "#0f172a",
  };

  // States to control staggered animations.
  const [showHeader, setShowHeader] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setShowHeader(true), 300);
    const timer2 = setTimeout(() => setShowContent(true), 800);
    const timer3 = setTimeout(() => setShowCTA(true), 1300);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        "@supports (height: 100svh)": { minHeight: "100svh" },
        background: pageBackground,
        color: theme.palette.text.primary,
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
        position: "relative",
        py: 4,
      }}
    >
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          opacity: isDark ? 0.12 : 0.05,
        }}
      />
      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        {/* Header Section */}
        <Fade in={showHeader} timeout={800}>
          <Box sx={{ textAlign: "center", my: 4 }}>
            <Typography
              variant="overline"
              sx={{
                letterSpacing: "0.3em",
                fontWeight: 700,
                color: alpha(theme.palette.text.primary, 0.6),
                display: "block",
                mb: 1,
              }}
            >
              LEGAL
            </Typography>
            <Typography
              variant={isMobile ? "h4" : "h3"}
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 800,
                color: isDark ? "white" : "black",
              }}
            >
              Terms &amp;{" "}
              <Box component="span" sx={gradientTextSx(theme)}>
                Conditions
              </Box>
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Please read these Terms and Conditions carefully before using
              Lumina AI.
            </Typography>
            <Typography
              variant="caption"
              sx={{ display: "block", mt: 1, color: "text.secondary" }}
            >
              Last updated June 2026
            </Typography>
          </Box>
        </Fade>

        {/* Content Section */}
        <Slide direction="up" in={showContent} timeout={800}>
          <Box
            sx={{
              my: 4,
              position: "relative",
              overflow: "hidden",
              p: { xs: 3, sm: 4 },
              borderRadius: 3,
              backgroundColor: alpha(
                theme.palette.background.paper,
                isDark ? 0.72 : 0.92,
              ),
              border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
              backdropFilter: "blur(16px)",
              boxShadow: isDark
                ? "0 24px 50px rgba(0,0,0,0.45)"
                : "0 24px 50px rgba(15,23,42,0.12)",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.info.main}, ${theme.palette.secondary.main})`,
              }}
            />
            {/* 1. Acceptance of Terms */}
            <Typography variant="h6" gutterBottom sx={sectionHeadingSx}>
              1. Acceptance of Terms
            </Typography>
            <Typography variant="body1" paragraph>
              By accessing and using Lumina AI, you agree to be bound by these
              Terms and Conditions, as well as any updates or modifications that
              may be made from time to time. Lumina AI is designed to provide
              dynamic insights into Son (David) Nguyen's professional
              background, skills, projects, and accomplishments. If you do not
              agree with these terms, please discontinue use of the service
              immediately.
            </Typography>

            {/* 2. Use of Lumina AI */}
            <Typography variant="h6" gutterBottom sx={sectionHeadingSx}>
              2. Use of Lumina AI
            </Typography>
            <Typography variant="body1" paragraph>
              Lumina AI is provided for informational and non-commercial
              purposes only. The service offers dynamic, data-driven insights
              into Son (David) Nguyen's professional journey, including but not
              limited to his technical skills, project contributions, and career
              milestones.
            </Typography>
            <Typography variant="body1" paragraph>
              You agree to use Lumina AI responsibly and in compliance with
              these Terms. Prohibited uses include:
            </Typography>
            <ul>
              <li>
                <Typography variant="body1">
                  Engaging in harassment, hate speech, or any form of abusive
                  communication.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  Attempting to bypass security measures, exploit
                  vulnerabilities, or reverse-engineer any aspect of the
                  application.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  Utilizing the service for any illegal, harmful, or unethical
                  activities, including the dissemination of misleading or false
                  information.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  Overloading, disrupting, or interfering with the performance
                  of Lumina AI through automated scripts or excessive requests.
                </Typography>
              </li>
            </ul>

            {/* 3. User Conduct and Responsibilities */}
            <Typography variant="h6" gutterBottom sx={sectionHeadingSx}>
              3. User Conduct and Responsibilities
            </Typography>
            <Typography variant="body1" paragraph>
              Users are expected to interact with Lumina AI in a respectful and
              constructive manner. All communications must adhere to community
              standards and applicable laws. You are responsible for any content
              you submit or share while using the service.
            </Typography>
            <Typography variant="body1" paragraph>
              Any misuse or abuse of the service may result in immediate
              suspension or termination of your access, without prior notice.
            </Typography>

            {/* 4. Intellectual Property Rights */}
            <Typography variant="h6" gutterBottom sx={sectionHeadingSx}>
              4. Intellectual Property Rights
            </Typography>
            <Typography variant="body1" paragraph>
              All content, design elements, user interface components, and
              underlying code of Lumina AI are the intellectual property of Son
              (David) Nguyen and its licensors. Unauthorized reproduction,
              distribution, or creation of derivative works is strictly
              prohibited. Please respect the intellectual property rights of the
              service and its creator.
            </Typography>

            {/* 5. Data Privacy and Security */}
            <Typography variant="h6" gutterBottom sx={sectionHeadingSx}>
              5. Data Privacy and Security
            </Typography>
            <Typography variant="body1" paragraph>
              We are dedicated to protecting your privacy and ensuring the
              security of your data. Lumina AI encrypts all user interactions
              and employs industry-standard security measures. Please review our
              Privacy Policy for a detailed explanation of how your data is
              collected, stored, and used.
            </Typography>
            <Typography variant="body1" paragraph>
              Although we take reasonable steps to safeguard your information,
              no method of data transmission over the internet is entirely
              secure. By using Lumina AI, you acknowledge and accept the
              inherent risks associated with online data exchange.
            </Typography>

            {/* 6. Modifications to the Terms and Service */}
            <Typography variant="h6" gutterBottom sx={sectionHeadingSx}>
              6. Modifications to the Terms and Service
            </Typography>
            <Typography variant="body1" paragraph>
              Lumina AI reserves the right to update or modify these Terms and
              Conditions at any time without prior notice. It is your
              responsibility to review this page periodically for any changes.
              Continued use of the service after modifications have been made
              constitutes your acceptance of the revised terms.
            </Typography>

            {/* 7. Limitation of Liability */}
            <Typography variant="h6" gutterBottom sx={sectionHeadingSx}>
              7. Limitation of Liability
            </Typography>
            <Typography variant="body1" paragraph>
              Lumina AI is provided on an "as is" basis, with no warranties or
              guarantees of any kind, either express or implied. Son (David)
              Nguyen, his affiliates, and licensors shall not be liable for any
              direct, indirect, incidental, consequential, or punitive damages
              arising from your use or inability to use this service.
            </Typography>
            <Typography variant="body1" paragraph>
              This limitation applies to all damages, including those resulting
              from loss of data, revenue, or any other intangible losses.
            </Typography>

            {/* 8. Indemnification */}
            <Typography variant="h6" gutterBottom sx={sectionHeadingSx}>
              8. Indemnification
            </Typography>
            <Typography variant="body1" paragraph>
              You agree to indemnify, defend, and hold harmless Son (David)
              Nguyen, his affiliates, officers, directors, employees, and agents
              from and against any claims, damages, obligations, losses,
              liabilities, costs, or expenses (including reasonable attorneys'
              fees) arising from:
            </Typography>
            <ul>
              <li>
                <Typography variant="body1">
                  Your use of Lumina AI or violation of these Terms and
                  Conditions.
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  Any content or data you submit, post, or transmit via the
                  service.
                </Typography>
              </li>
            </ul>

            {/* 9. Dispute Resolution */}
            <Typography variant="h6" gutterBottom sx={sectionHeadingSx}>
              9. Dispute Resolution
            </Typography>
            <Typography variant="body1" paragraph>
              In the event of any dispute arising from these Terms or your use
              of Lumina AI, you agree to first attempt to resolve the dispute
              informally by contacting our support team. Should an informal
              resolution fail, any unresolved disputes will be submitted to
              binding arbitration in accordance with the rules of the applicable
              jurisdiction.
            </Typography>
            <Typography variant="body1" paragraph>
              You further agree that any such arbitration shall be conducted on
              an individual basis, and not as a class action or other
              representative action.
            </Typography>

            {/* 10. Governing Law and Jurisdiction */}
            <Typography variant="h6" gutterBottom sx={sectionHeadingSx}>
              10. Governing Law and Jurisdiction
            </Typography>
            <Typography variant="body1" paragraph>
              These Terms and Conditions shall be governed by and construed in
              accordance with the laws of the jurisdiction in which Lumina AI is
              offered. Any disputes arising from these terms shall be subject to
              the exclusive jurisdiction of the appropriate courts in that
              jurisdiction.
            </Typography>

            {/* 11. Termination of Access */}
            <Typography variant="h6" gutterBottom sx={sectionHeadingSx}>
              11. Termination of Access
            </Typography>
            <Typography variant="body1" paragraph>
              Lumina AI reserves the right to suspend or terminate your access
              to the service at any time, with or without notice, if you are
              found to be in violation of these Terms and Conditions. Upon
              termination, all rights granted to you will immediately cease.
            </Typography>

            {/* 12. Account Security and User Data */}
            <Typography variant="h6" gutterBottom sx={sectionHeadingSx}>
              12. Account Security and User Data
            </Typography>
            <Typography variant="body1" paragraph>
              If you create an account with Lumina AI, you are responsible for
              maintaining the confidentiality of your login credentials and any
              other sensitive information. You agree to notify us immediately of
              any unauthorized access to your account.
            </Typography>
            <Typography variant="body1" paragraph>
              Additionally, while Lumina AI stores conversation history for
              authenticated users, all such data is encrypted and handled
              according to our privacy policies.
            </Typography>

            {/* 13. Service Availability and Maintenance */}
            <Typography variant="h6" gutterBottom sx={sectionHeadingSx}>
              13. Service Availability and Maintenance
            </Typography>
            <Typography variant="body1" paragraph>
              While we strive to maintain continuous and uninterrupted access to
              Lumina AI, there may be periods of scheduled or unscheduled
              downtime for maintenance, updates, or unforeseen issues. We will
              use reasonable efforts to notify users of significant service
              disruptions.
            </Typography>

            {/* 14. Third-Party Services and Integrations */}
            <Typography variant="h6" gutterBottom sx={sectionHeadingSx}>
              14. Third-Party Services and Integrations
            </Typography>
            <Typography variant="body1" paragraph>
              Lumina AI leverages several third-party technologies and services
              (such as the Gemini API, Pinecone vector database, and various
              open-source libraries) to deliver its functionalities. Your use of
              these third-party services is subject to the terms and conditions
              of those providers, and we are not responsible for any issues
              arising from them.
            </Typography>

            {/* 15. Disclaimer of Endorsements */}
            <Typography variant="h6" gutterBottom sx={sectionHeadingSx}>
              15. Disclaimer of Endorsements
            </Typography>
            <Typography variant="body1" paragraph>
              Any opinions, advice, or statements provided by Lumina AI are
              generated by advanced algorithms and are for informational
              purposes only. They do not constitute professional or legal
              advice. Users should exercise their own judgment and seek
              independent advice when necessary.
            </Typography>

            {/* 16. Feedback and Contact */}
            <Typography variant="h6" gutterBottom sx={sectionHeadingSx}>
              16. Feedback and Contact
            </Typography>
            <Typography variant="body1" paragraph>
              We welcome your comments, suggestions, and feedback regarding
              Lumina AI. If you have any questions, concerns, or require further
              clarification about these Terms and Conditions, please contact us
              at our support email at:{" "}
              <MuiLink href="mailto:hoangson091104@gmail.com">
                hoangson091104@gmail.com
              </MuiLink>
              .
            </Typography>
            <Typography variant="body1" paragraph>
              Your feedback is important to us and will be used to improve the
              service continuously.
            </Typography>
            {/* horizontal line */}
            <hr style={{ margin: "2rem 0" }} />

            {/* 17. Thank You */}
            <Typography variant="body1" paragraph>
              Thank you for using Lumina AI. We hope you find the service
              informative and engaging! 🚀 For more information about Son
              (David) Nguyen, please visit my personal website at{" "}
              <MuiLink href="https://sonnguyenhoang.com/">
                sonnguyenhoang.com
              </MuiLink>
              . Please enjoy your experience! 🌐
            </Typography>
          </Box>
        </Slide>

        {/* Call-to-Action Section */}
        <Fade in={showCTA} timeout={800}>
          <Box
            sx={{
              mt: 4,
              textAlign: "center",
              display: "flex",
              justifyContent: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate("/chat")}
              sx={brandButtonSx(theme)}
            >
              Back to Chat
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              onClick={() => navigate("/")}
              sx={{
                px: 4,
                py: 1.5,
                fontWeight: "bold",
                borderRadius: 2,
                transition: "transform 0.3s",
                "&:hover": { transform: "scale(1.05)" },
              }}
            >
              Back to Home
            </Button>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
};

export default TermsPage;
