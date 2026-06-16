import React, { useState } from "react";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import type { TextFieldProps } from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { authFieldSx } from "./styles";

/**
 * A password TextField with a built-in show/hide toggle. Accepts all standard
 * MUI TextField props except `type`, which it manages internally.
 */
type PasswordFieldProps = Omit<TextFieldProps, "type">;

const PasswordField: React.FC<PasswordFieldProps> = ({
  InputProps,
  sx,
  ...rest
}) => {
  const [show, setShow] = useState(false);

  return (
    <TextField
      {...rest}
      type={show ? "text" : "password"}
      sx={{ ...authFieldSx, ...sx }}
      InputProps={{
        ...InputProps,
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              onClick={() => setShow((s) => !s)}
              edge="end"
              disabled={rest.disabled}
              aria-label={show ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {show ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
};

export default PasswordField;
